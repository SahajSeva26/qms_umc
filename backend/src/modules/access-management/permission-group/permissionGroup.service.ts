import mongoose, { HydratedDocument } from 'mongoose';
import { IPermissionGroup, PermissionGroupModel } from './permissionGroup.model';
import { ICreatePermissionGroupPayload, ISearchPermissionGroupQuery, IUpdatePermissionGroupPayload } from './permissionGroup.validators';
import { PERMISSION_GROUP_STATUSES } from './permissionGroup.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { toObjectId, isValidObjectID } from '../../../shared/utils/strings';
import { PERMISSIONS_ARRAY } from '../../../shared/env/permissions';
import { TenantService } from '../tenant/tenant.service';
import { IServiceOptions } from '../../../shared/types/service.types';

type PermissionGroupDocument = HydratedDocument<IPermissionGroup> | null;
const populate: any[] = [];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<IPermissionGroup>, ctx: RequestContext) => {
    if (model.code) {
        entity.code = model.code;
    }
    if (model.name) {
        entity.name = model.name;
    }
    if (model.description) {
        entity.description = model.description;
    }
    if (model.status) {
        entity.status = model.status;
    }
    if (model.permissions && model.permissions.length > 0) {
        if (await handlePermissionUpdate(model, ctx)) {
            entity.permissions = model.permissions;
        }
    }
    if (model.tenant) {
        // validate tenant exists
        const tenant = await TenantService.get(model.tenant, ctx);
        if (!tenant) {
            throwAppError('Tenant not found', StatusCodes.NOT_FOUND);
        }
        entity.tenant = toObjectId(model.tenant);
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<PermissionGroupDocument> => {
    let query = null;

    if (isValidObjectID(id)) {
        query = PermissionGroupModel.findOne({ _id: id });
    } else {
        query = PermissionGroupModel.findOne({ code: id });
    }

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchPermissionGroupQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    const where: mongoose.QueryFilter<IPermissionGroup> = {};

    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.code) {
        where.code = { $regex: filters.code, $options: 'i' };
    }
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.tenant) {
        where.tenant = toObjectId(filters.tenant);
    }

    const countPromise = PermissionGroupModel.countDocuments(where);

    const dataPromise = PermissionGroupModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreatePermissionGroupPayload, ctx: RequestContext): Promise<HydratedDocument<IPermissionGroup>> => {
    let permissionGroup: PermissionGroupDocument = null;

    //1: check existing permission group
    permissionGroup = await PermissionGroupService.get(model.code, ctx);
    if (permissionGroup) {
        return throwAppError('Permission group with this code already exists', StatusCodes.CONFLICT);
    }

    //2: create permission group
    const entity = new PermissionGroupModel();

    //3: set fields
    permissionGroup = await set(model, entity, ctx);
    permissionGroup = await permissionGroup.save();

    return permissionGroup;
};

const update = async (id: string, model: IUpdatePermissionGroupPayload, ctx: RequestContext) => {
    //1: get permission group first
    let permissionGroup: PermissionGroupDocument = null;
    permissionGroup = await PermissionGroupService.get(id, ctx);
    if (!permissionGroup) {
        return throwAppError('Permission group not found', StatusCodes.NOT_FOUND);
    }

    //2: update
    permissionGroup = await set(model, permissionGroup, ctx);
    permissionGroup = await permissionGroup.save();

    return permissionGroup;
};

// ========================================================================================
// EXPORTS
// ========================================================================================

export const PermissionGroupService = {
    get,
    search,
    create,
    update,
};
const handlePermissionUpdate = async (model: any, ctx: RequestContext) => {
    const log = ctx.logger;
    // chec if permisisons are valid by system
    let inValidPermissions = model.permissions.filter((permission: any) => !PERMISSIONS_ARRAY.includes(permission.code));
    if (inValidPermissions.length > 0) {
        throwAppError(`Invalid permissions: ${inValidPermissions.map((p: any) => p.code).join(', ')}`, StatusCodes.BAD_REQUEST);
    }

    //check if permissions are allowed by permission group of the one who is acting(admin)
    log.debug('Searching for permission group', { tenant: ctx.tenant.id });
    let permissionGroup: any = await PermissionGroupService.search({ tenant: ctx.tenant._id }, ctx);
    if (permissionGroup.count == 0) {
        log.error('Permission group not found');
        throwAppError('Permission group not found', StatusCodes.NOT_FOUND);
    }
    permissionGroup = permissionGroup.items[0];

    //flat permissions of  permision group
    const allowedGroupPermissions = permissionGroup.permissions.map((permission: any) => permission.code);
    inValidPermissions = model.permissions.filter((perm: any) => !allowedGroupPermissions.includes(perm.code));
    if (inValidPermissions.length > 0) {
        throwAppError(`Invalid permissions: ${inValidPermissions.map((p: any) => p.code).join(', ')}`, StatusCodes.BAD_REQUEST);
    }

    log.info('Permissions validated successfully');
    return true;
};
