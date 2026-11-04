// Rating Service
import mongoose, { HydratedDocument } from 'mongoose';
import { RatingModel, IRating } from './rating.model';
import { RatingDocument } from './rating.types';
import { ICreateRatingPayload, ISearchRatingQuery, IUpdateRatingPayload } from './rating.validators';
import { RATING_PERMISSIONS } from './rating.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID, toObjectId } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { CampService } from '../camp/camp.service';
import { CAMP_STATUSES } from '../camp/camp.constants';
import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';

// ratings are "owned" only by the three field roles involved — the rated worker (FO/dietitian) and the
// rater (MR). These role types see only their own ratings; any OTHER read-granted actor (ops team) sees
// all ratings within their tenant.
const SELF_SCOPED_RATING_ROLE_TYPES: string[] = [
    ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER,
    ALLOWED_ROLETYPE_CODES.PLATFORM.DIETITIAN,
    ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_MR,
];

const populate: any[] = [
    { path: 'tenant', select: 'name code' },
    { path: 'camp', select: 'code date status type' },
    { path: 'worker', select: 'name code' },
    { path: 'ratedBy', select: 'name code' },
];

// a camp is rateable only once it is CLOSED (the work is done)
const RATEABLE_CAMP_STATUSES: string[] = [CAMP_STATUSES.CLOSED];

// ================================ HELPERS ================================

// overall is always the mean of the three sub-scores (1 decimal) — never trusted from the payload
const computeOverall = (onTime: number, attire: number, communication: number): number =>
    Math.round(((onTime + attire + communication) / 3) * 10) / 10;

const idOf = (ref: any): string | undefined => {
    if (!ref) {
        return undefined;
    }
    return (ref._id ?? ref).toString();
};

// only the camp's MR (the booker) may rate its worker; a rating:manage actor bypasses this.
const assertCampMrOrManage = (camp: any, ctx: RequestContext) => {
    if (ctx.hasAnyPermissions([RATING_PERMISSIONS.MANAGE.code])) {
        return;
    }
    const mrId = idOf(camp?.mr);
    if (!mrId || !ctx.role?._id || mrId !== ctx.role._id.toString()) {
        return throwAppError('Only the MR who booked this camp can rate its worker', StatusCodes.FORBIDDEN);
    }
};

// only the rater (ratedBy) or a manage actor may edit a rating — the rated worker can read it (via
// own-scope) but not change it.
const assertRaterOrManage = (rating: any, ctx: RequestContext) => {
    if (ctx.hasAnyPermissions([RATING_PERMISSIONS.MANAGE.code])) {
        return;
    }
    const raterId = idOf(rating?.ratedBy);
    if (!raterId || !ctx.role?._id || raterId !== ctx.role._id.toString()) {
        return throwAppError('Only the rater can edit this rating', StatusCodes.FORBIDDEN);
    }
};

// the FO/dietitian (worker) and MR (rater) see only ratings about/by them; manage AND the ops team
// (coordinators/managers granted read, who are NOT self-scoped role types) see all within ctx.where().
const applyOwnScope = (where: any, ctx: RequestContext) => {
    if (ctx.hasAnyPermissions([RATING_PERMISSIONS.MANAGE.code])) {
        return;
    }
    if (SELF_SCOPED_RATING_ROLE_TYPES.includes(ctx.role?.type?.code)) {
        where.$or = [{ worker: ctx.role?._id }, { ratedBy: ctx.role?._id }];
    }
};

// "my ratings" — always pinned to the caller (ratings about them as worker OR given by them as rater),
// regardless of role type / manage. Backs GET /ratings/me.
const mine = async (filters: ISearchRatingQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    const where: mongoose.QueryFilter<IRating> = { ...ctx.where() };
    where.$or = [{ worker: ctx.role?._id }, { ratedBy: ctx.role?._id }];

    if (filters.camp) {
        where.camp = toObjectId(filters.camp);
    }

    const countPromise = RatingModel.countDocuments(where);
    const dataPromise = RatingModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

// ================================ CORE FUNCTIONS ================================

// only the three sub-scores are editable; overall is re-derived whenever a score changes. camp /
// worker / ratedBy / tenant are pinned at create.
const set = (model: any, entity: HydratedDocument<IRating>) => {
    if (model.onTime !== undefined) {
        entity.onTime = model.onTime;
    }
    if (model.attire !== undefined) {
        entity.attire = model.attire;
    }
    if (model.communication !== undefined) {
        entity.communication = model.communication;
    }
    entity.overall = computeOverall(entity.onTime, entity.attire, entity.communication);
    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<RatingDocument | null> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    const where: mongoose.QueryFilter<IRating> = ctx.where();
    where._id = id;
    applyOwnScope(where, ctx);

    let query = RatingModel.findOne(where);
    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchRatingQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    const where: mongoose.QueryFilter<IRating> = { ...ctx.where() };
    // own-scope up-front — a non-manage actor is pinned to ratings about/by them. Safe here because the
    // actor-widening filters below (ratedBy / tenant) are themselves manage-gated.
    applyOwnScope(where, ctx);

    if (filters.camp) {
        where.camp = toObjectId(filters.camp);
    }
    if (filters.worker) {
        where.worker = toObjectId(filters.worker);
    }
    // ratedBy filter is honoured only for a rating:manage actor (others are own-scoped above)
    if (filters.ratedBy && ctx.hasAnyPermissions([RATING_PERMISSIONS.MANAGE.code])) {
        where.ratedBy = toObjectId(filters.ratedBy);
    }
    // tenant filter (switch tenants) only for a manage actor not already tenant-pinned by ctx.where()
    if (filters.tenant && !where.tenant && ctx.hasAnyPermissions([RATING_PERMISSIONS.MANAGE.code])) {
        where.tenant = toObjectId(filters.tenant);
    }

    const countPromise = RatingModel.countDocuments(where);
    const dataPromise = RatingModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateRatingPayload, ctx: RequestContext): Promise<HydratedDocument<IRating>> => {
    //1: load the camp (scoped — a pharma MR only resolves camps they booked) + authorize the actor as
    // the camp's MR (or manage). The rating inherits its tenant from the camp.
    const camp: any = await CampService.get(model.camp, ctx, { populate: true });
    if (!camp) {
        return throwAppError('Camp not found', StatusCodes.NOT_FOUND);
    }
    assertCampMrOrManage(camp, ctx);

    //2: a camp can only be rated once it is closed
    if (!RATEABLE_CAMP_STATUSES.includes(camp.status)) {
        return throwAppError('A camp can only be rated once it is closed', StatusCodes.CONFLICT);
    }

    //3: the rated worker = the camp's assigned worker (dietitian for diet, else fo)
    const worker = CampService.workerFor(camp.type);
    const workerId = idOf(camp[worker.field]);
    if (!workerId) {
        return throwAppError(`This camp has no assigned ${worker.label} to rate`, StatusCodes.CONFLICT);
    }

    const ratedBy = ctx.role?._id;
    if (!ratedBy) {
        return throwAppError('No acting role to attribute the rating to', StatusCodes.UNAUTHORIZED);
    }
    const tenant = idOf(camp.tenant);
    if (!tenant) {
        return throwAppError('Camp has no tenant', StatusCodes.CONFLICT);
    }

    //4: one rating per (tenant, camp, worker, rater) — reuse search (the unique index backstops any
    // race). ratedBy is passed so a manage actor checks their OWN prior rating; for a non-manage MR the
    // filter is ignored but own-scope already pins ratedBy to them, so the check is correct either way.
    const { count } = await RatingService.search(
        { camp: camp._id.toString(), worker: workerId, ratedBy: ratedBy.toString() },
        ctx,
    );
    if (count > 0) {
        return throwAppError('You have already rated this worker for this camp', StatusCodes.CONFLICT);
    }

    //5: build + apply (set computes overall from the three sub-scores)
    const entity = new RatingModel({
        camp: camp._id,
        worker: toObjectId(workerId),
        ratedBy,
        tenant: toObjectId(tenant),
    });

    let rating = set(model, entity);
    rating = await rating.save();
    return rating;
};

const update = async (id: string, model: IUpdateRatingPayload, ctx: RequestContext) => {
    let rating = await RatingService.get(id, ctx);
    if (!rating) {
        return throwAppError('Rating not found', StatusCodes.NOT_FOUND);
    }

    // own-scope lets the rated worker read it; only the rater (or manage) may edit
    assertRaterOrManage(rating, ctx);

    rating = set(model, rating);
    rating = await rating.save();

    return rating;
};

export const RatingService = {
    get,
    search,
    mine,
    create,
    update,
};
