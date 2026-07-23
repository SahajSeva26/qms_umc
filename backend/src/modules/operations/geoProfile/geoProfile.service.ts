// GeoProfile Service
import mongoose, { HydratedDocument } from 'mongoose';
import { geoProfileModel, IGeoProfile } from './geoProfile.model';
import {
    ICreateGeoProfilePayload,
    INearestGeoProfileQuery,
    ISearchGeoProfileQuery,
    IUpdateGeoProfilePayload,
} from './geoProfile.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { RoleService } from '../../access-management/role/role.service';
import { GEO_ALLOCATION_MAX_DISTANCE, GEO_PROFILE_PERMISSIONS, GEO_PROFILE_STATUS } from './geoProfile.constants';

type GeoProfileDocument = HydratedDocument<IGeoProfile> | null;

const populate: any[] = [
    { path: 'tenant', select: 'name code type' },
    { path: 'role', select: 'code name type user tenant' },
];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// role + tenant are the immutable link — seeded in create(), never touched here, so update()
// can never reassign the profile to a different person or company.
const set = async (model: any, entity: HydratedDocument<IGeoProfile>, ctx: RequestContext) => {
    if (model.type) entity.type = model.type;
    if (model.status) entity.status = model.status;
    if (model.coordinates) entity.coordinates = model.coordinates;
    if (model.coverageRadius !== undefined) entity.coverageRadius = model.coverageRadius;
    if (model.meta !== undefined) entity.meta = model.meta;

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<GeoProfileDocument> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    const where: any = { ...ctx.where(), _id: id };

    let query = geoProfileModel.findOne(where);
    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchGeoProfileQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { updatedAt: -1 };

    //1: default scoping — only active profiles are visible by default
    const where: any = { ...ctx.where() };
    where.status = GEO_PROFILE_STATUS.ACTIVE;

    //2: add search filters
    if (filters.type) {
        where.type = filters.type;
    }
    if (filters.role) {
        where.role = filters.role;
    }
    // only a manage-level actor may look past active (see inactive/retired profiles)
    if (filters.status && ctx.hasAnyPermissions([GEO_PROFILE_PERMISSIONS.MANAGE.code])) {
        where.status = filters.status;
    }

    //3: execute count + data together
    const countPromise = geoProfileModel.countDocuments(where);
    const dataPromise = geoProfileModel
        .find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateGeoProfilePayload, ctx: RequestContext): Promise<HydratedDocument<IGeoProfile>> => {
    //1: the linked role must exist and be visible to the actor; the profile inherits its tenant
    const role = await RoleService.get(model.role, ctx);
    if (!role) {
        return throwAppError('Role not found', StatusCodes.NOT_FOUND);
    }

    //2: guard — a role may back at most one geo profile (1:1 invariant, also enforced by the unique index)
    const existing = await geoProfileModel.findOne({ role: model.role });
    if (existing) {
        return throwAppError('A geo profile already exists for this role', StatusCodes.CONFLICT);
    }

    //3: build entity — tenant + role (immutable link) are seeded here, never in set()
    const entity = new geoProfileModel({
        tenant: role.tenant,
        role: role._id,
        type: model.type,
    });

    //4: set applies coordinates / coverageRadius / meta (and type again, harmless)
    let profile = await set(model, entity, ctx);
    profile = await profile.save();

    return profile;
};

const update = async (id: string, model: IUpdateGeoProfilePayload, ctx: RequestContext) => {
    //1: get first (scoped)
    let profile = await GeoProfileService.get(id, ctx);
    if (!profile) {
        return throwAppError('Geo profile not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (role + tenant are immutable — set() never touches them)
    profile = await set(model, profile, ctx);
    profile = await profile.save();

    return profile;
};

// findNearest is the allocation query: field staff of `type` whose OWN coverage radius reaches
// the target point, nearest first. Because each profile has its own radius, we cannot use a single
// maxDistance — $geoNear computes per-doc distance (meters, spherical), then we keep only those
// whose distance is within their coverageRadius.
const findNearest = async (filters: INearestGeoProfileQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const limit = options?.pagination?.limit || 10;

    // never allocate an inactive (on-leave / retired) profile
    const query: any = { ...ctx.where(), type: filters.type, status: GEO_PROFILE_STATUS.ACTIVE };

    const items = await geoProfileModel.aggregate([
        {
            $geoNear: {
                near: { type: 'Point', coordinates: [filters.lng, filters.lat] },
                distanceField: 'distance', // meters
                spherical: true,
                // hard outer cap — a mis-set coverageRadius can never pull in a far-away worker
                maxDistance: GEO_ALLOCATION_MAX_DISTANCE,
                query,
            },
        },
        // keep only staff whose own coverage reaches the point
        { $match: { $expr: { $lte: ['$distance', '$coverageRadius'] } } },
        { $limit: limit },
    ]);

    return { count: items.length, items };
};

export const GeoProfileService = {
    get,
    search,
    create,
    update,
    findNearest,
};
