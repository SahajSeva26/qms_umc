// Otp Service
import { HydratedDocument } from 'mongoose';
import { OtpModel, IOtp } from './otp.model';
import { OtpDocument } from './otp.types';
import { ICreateOtpPayload, ISearchOtpQuery, IVerifyOtpPayload } from './otp.validators';
import { OTP_DEFAULTS, OTP_STATUS } from './otp.constants';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../shared/utils/strings';
import { IServiceOptions } from '../../shared/types/service.types';
import { OtpHandler } from '../../shared/utils/otp';
import { withTransaction } from '../../shared/helpers/transactionHelper';

// OTP is a global store — no tenant, so no ctx.where() scoping.
const populate: any[] = [];

// locate an OTP by what it was issued for — purpose + whichever entity fields are supplied
const buildLookup = (purpose: string, entity?: any) => {
    const where: any = { purpose };
    if (entity?.id) {
        where['entity.id'] = entity.id;
    }
    if (entity?.type) {
        where['entity.type'] = entity.type;
    }
    if (entity?.relation) {
        where['entity.relation'] = entity.relation;
    }
    return where;
};

// map a nested entity ({ type, relation, id }) to the flat search filters
const entityFilters = (entity?: any) => ({
    entityType: entity?.type,
    entityRelation: entity?.relation,
    entityId: entity?.id,
});

// ========================================================================================
// INTERNAL
// ========================================================================================

// raw field applier — copies whatever fields are present; the public methods compute the derived values.
const set = (model: any, entity: HydratedDocument<IOtp>) => {
    if (model.purpose) {
        entity.purpose = model.purpose;
    }
    if (model.channel) {
        entity.channel = model.channel;
    }
    if (model.entity !== undefined) {
        entity.entity = model.entity;
    }
    if (model.code) {
        entity.code = model.code;
    }
    if (model.expiresAt !== undefined) {
        entity.expiresAt = model.expiresAt;
    }
    if (model.status) {
        entity.status = model.status;
    }
    if (model.attempts !== undefined) {
        entity.attempts = model.attempts;
    }
    if (model.verifiedAt !== undefined) {
        entity.verifiedAt = model.verifiedAt;
    }
    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<OtpDocument> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    let query = OtpModel.findOne({ _id: id });
    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

// raw list — filters by purpose/status/entity, newest first.
const search = async (filters: ISearchOtpQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    const where: any = {};
    if (filters.purpose) {
        where.purpose = filters.purpose;
    }
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.entityType) {
        where['entity.type'] = filters.entityType;
    }
    if (filters.entityRelation) {
        where['entity.relation'] = filters.entityRelation;
    }
    if (filters.entityId) {
        where['entity.id'] = filters.entityId;
    }

    const countPromise = OtpModel.countDocuments(where);
    const dataPromise = OtpModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

// raw insert — persists exactly what it's given. All derivation/validation happens in the caller.
const create = async (model: any, ctx: RequestContext): Promise<HydratedDocument<IOtp>> => {
    let entity = new OtpModel({});
    entity = set(model, entity);
    entity = await entity.save();

    return entity;
};

const update = async (id: string, model: any, ctx: RequestContext): Promise<HydratedDocument<IOtp>> => {
    let entity = await get(id, ctx);
    if (!entity) {
        return throwAppError('OTP not found', StatusCodes.NOT_FOUND);
    }

    entity = set(model, entity);
    entity = await entity.save();

    return entity;
};

// ========================================================================================
// PUBLIC
// ========================================================================================

// issue an OTP: only one may be live per target (prior pending ones are expired), code is a 6-digit
// server value, expiry is now + the TTL.
const request = async (model: ICreateOtpPayload, ctx: RequestContext): Promise<HydratedDocument<IOtp>> => {
    const otp = await withTransaction(async () => {
        //1: expire any prior live OTP for the same target so verify never faces ambiguity
        const lookup = buildLookup(model.purpose, model.entity);
        lookup.status = OTP_STATUS.PENDING;
        await OtpModel.updateMany(lookup, { $set: { status: OTP_STATUS.EXPIRED } });

        //2: derive the code + expiry, then hand a complete record to the raw create
        const expiryMinutes = model.expiresInMinutes ?? OTP_DEFAULTS.EXPIRY_MINUTES;
        const created = await create(
            {
                purpose: model.purpose,
                channel: model.channel,
                entity: model.entity,
                code: OtpHandler.generate(),
                status: OTP_STATUS.PENDING,
                expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
                attempts: 0,
            },
            ctx,
        );

        return created;
    });

    return otp;
};

// reissue an OTP — only if one was already requested and the resend cooldown has elapsed, then reuse request().
const resend = async (model: ICreateOtpPayload, ctx: RequestContext): Promise<HydratedDocument<IOtp>> => {
    //1: there must be a prior OTP for this target to "resend"
    const { items } = await search(
        { purpose: model.purpose, ...entityFilters(model.entity) },
        ctx,
        { pagination: { limit: 1 } },
    );
    const latest = items[0];
    if (!latest) {
        return throwAppError('No OTP to resend — request one first', StatusCodes.BAD_REQUEST);
    }

    //2: throttle — the last OTP must be older than the resend cooldown
    const issuedAt = (latest as any).createdAt as Date;
    const elapsedSeconds = (Date.now() - issuedAt.getTime()) / 1000;
    if (elapsedSeconds < OTP_DEFAULTS.RESEND_COOLDOWN_SECONDS) {
        const wait = Math.ceil(OTP_DEFAULTS.RESEND_COOLDOWN_SECONDS - elapsedSeconds);
        return throwAppError(`Please wait ${wait}s before requesting another OTP`, StatusCodes.TOO_MANY_REQUESTS);
    }

    //3: conditions passed — issue a fresh OTP
    const otp = await request(model, ctx);
    return otp;
};

// verify a code against the most recent pending OTP for the purpose+entity; every outcome is persisted via update().
const verify = async (model: IVerifyOtpPayload, ctx: RequestContext): Promise<HydratedDocument<IOtp>> => {
    const { items } = await search(
        { purpose: model.purpose, status: OTP_STATUS.PENDING, ...entityFilters(model.entity) },
        ctx,
        { pagination: { limit: 1 } },
    );
    const otp = items[0];
    if (!otp) {
        return throwAppError('No pending OTP found for this request', StatusCodes.NOT_FOUND);
    }
    const id = otp._id.toString();

    //1: expired — mark it and reject
    if (otp.expiresAt.getTime() < Date.now()) {
        await update(id, { status: OTP_STATUS.EXPIRED }, ctx);
        return throwAppError('OTP has expired', StatusCodes.BAD_REQUEST);
    }

    //2: already out of attempts — block and reject
    if (otp.attempts >= otp.maxAttempts) {
        await update(id, { status: OTP_STATUS.BLOCKED }, ctx);
        return throwAppError('OTP is blocked due to too many failed attempts', StatusCodes.TOO_MANY_REQUESTS);
    }

    //3: wrong code — count the attempt, block if this was the last one
    if (otp.code !== model.code) {
        const attempts = otp.attempts + 1;
        const status = attempts >= otp.maxAttempts ? OTP_STATUS.BLOCKED : OTP_STATUS.PENDING;
        await update(id, { attempts, status }, ctx);
        return throwAppError('Invalid OTP code', StatusCodes.BAD_REQUEST);
    }

    //4: success
    const verified = await update(id, { status: OTP_STATUS.VERIFIED, verifiedAt: new Date() }, ctx);
    return verified;
};

export const OtpService = {
    request,
    resend,
    verify,
};
