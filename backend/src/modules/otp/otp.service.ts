// Otp Service
import { HydratedDocument } from 'mongoose';
import { OtpModel, IOtp } from './otp.model';
import { ICreateOtpPayload, ISearchOtpQuery, IVerifyOtpPayload } from './otp.validators';
import { OTP_DEFAULTS, OTP_STATUS } from './otp.constants';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../shared/utils/strings';
import { IServiceOptions } from '../../shared/types/service.types';
import { OtpHandler } from '../../shared/utils/otp';
import { withTransaction } from '../../shared/helpers/transactionHelper';

type OtpDocument = HydratedDocument<IOtp> | null;

// OTP is a global/system store — it belongs to no tenant, so there is no ctx.where() scoping.
const populate: any[] = [];

// Filter that locates an OTP by what it was issued for: purpose plus whichever entity fields are
// supplied. Shared by create (to expire the prior live OTP) and verify (to find the one to match).
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

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// caller-settable fields only — code/status/expiresAt/attempts/verifiedAt are derived/pinned in
// create() and managed by verify(), never set here.
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
    // lifecycle fields — driven by verify(), not accepted from a client payload
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

// generate a fresh OTP for a purpose (+ optional entity). Any still-pending OTP for the same
// purpose+entity is expired first, so only one OTP is ever live for a given target.
const create = async (model: ICreateOtpPayload, ctx: RequestContext): Promise<HydratedDocument<IOtp>> => {
    const otp = await withTransaction(async () => {
        //1: expire any prior live OTP for the same target so verify never faces ambiguity
        const lookup = buildLookup(model.purpose, model.entity);
        lookup.status = OTP_STATUS.PENDING;
        await OtpModel.updateMany(lookup, { $set: { status: OTP_STATUS.EXPIRED } });

        //2: code is a server-generated 6-digit value; expiry is now + the TTL (caller's or default)
        const expiryMinutes = model.expiresInMinutes ?? OTP_DEFAULTS.EXPIRY_MINUTES;
        const code = OtpHandler.generate();
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

        //3: pin the server-derived fields, apply the caller-settable ones via set()
        let entity = new OtpModel({ code, status: OTP_STATUS.PENDING, expiresAt, attempts: 0 });
        entity = set(model, entity);
        entity = await entity.save();

        return entity;
    });

    return otp;
};

const update = async (id: string, model: any, ctx: RequestContext): Promise<HydratedDocument<IOtp>> => {
    let entity = await OtpService.get(id, ctx);
    if (!entity) {
        return throwAppError('OTP not found', StatusCodes.NOT_FOUND);
    }

    entity = set(model, entity);
    entity = await entity.save();

    return entity;
};

// verify a submitted code against the most recent pending OTP for the purpose+entity. Expiry and the
// attempt cap are enforced here; every state change is persisted through update().
const verify = async (model: IVerifyOtpPayload, ctx: RequestContext): Promise<HydratedDocument<IOtp>> => {
    const where = buildLookup(model.purpose, model.entity);
    where.status = OTP_STATUS.PENDING;

    const otp = await OtpModel.findOne(where).sort({ createdAt: -1 });
    if (!otp) {
        return throwAppError('No pending OTP found for this request', StatusCodes.NOT_FOUND);
    }
    const id = otp._id.toString();

    //1: expired — mark it and reject
    if (otp.expiresAt.getTime() < Date.now()) {
        await OtpService.update(id, { status: OTP_STATUS.EXPIRED }, ctx);
        return throwAppError('OTP has expired', StatusCodes.BAD_REQUEST);
    }

    //2: already out of attempts — block and reject
    if (otp.attempts >= otp.maxAttempts) {
        await OtpService.update(id, { status: OTP_STATUS.BLOCKED }, ctx);
        return throwAppError('OTP is blocked due to too many failed attempts', StatusCodes.TOO_MANY_REQUESTS);
    }

    //3: wrong code — count the attempt, block if this was the last one
    if (otp.code !== model.code) {
        const attempts = otp.attempts + 1;
        const status = attempts >= otp.maxAttempts ? OTP_STATUS.BLOCKED : OTP_STATUS.PENDING;
        await OtpService.update(id, { attempts, status }, ctx);
        return throwAppError('Invalid OTP code', StatusCodes.BAD_REQUEST);
    }

    //4: success
    return await OtpService.update(id, { status: OTP_STATUS.VERIFIED, verifiedAt: new Date() }, ctx);
};

export const OtpService = {
    get,
    search,
    create,
    update,
    verify,
};
