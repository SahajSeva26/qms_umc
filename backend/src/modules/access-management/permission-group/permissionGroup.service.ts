import mongoose, { HydratedDocument } from 'mongoose';
import { IPermissionGroup, PermissionGroupModel } from './permissionGroup.model';
import { ICreatePermissionGroupPayload, ISearchPermissionGroupQuery, IUpdatePermissionGroupPayload } from './permissionGroup.validators';
import { PERMISSION_GROUP_STATUSES } from './permissionGroup.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { toObjectId, isValidObjectID, escapeRegex } from '../../../shared/utils/strings';
import { PERMISSIONS_ARRAY, SYSTEM_PERMISSIONS } from '../../../shared/env/permissions';
import { TenantService } from '../tenant/tenant.service';
import { IServiceOptions } from '../../../shared/types/service.types';
import ENV from '../../../shared/config/app.config';

type PermissionGroupDocument = HydratedDocument<IPermissionGroup> | null;
const populate: any[] = [];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<IPermissionGroup>, ctx: RequestContext) => {
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
            //TODO: add audit log
            //TODO: also make a simple transaction, which will ROLE-TYPE and ROLE with new permissions
        }
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<PermissionGroupDocument> => {
    // Scoping is opt-in (not applied unconditionally) because create() also
    // calls get() to check code-uniqueness, and PermissionGroup.code has a
    // GLOBAL unique index (permissionGroup.model.ts) — that check must stay
    // tenant-unscoped, or two different tenants could each create a group
    // with the same code and collide. Real by-id/by-code lookups (update(),
    // and the controller's own get) opt in explicitly.
    const scope = options?.scopeToTenant ? ctx.where() : {};

    let query = null;

    if (isValidObjectID(id)) {
        query = PermissionGroupModel.findOne({ ...scope, _id: id });
    } else {
        query = PermissionGroupModel.findOne({ ...scope, code: id });
    }

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchPermissionGroupQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    const where: mongoose.QueryFilter<IPermissionGroup> = ctx.where();

    if (filters.name) {
        where.name = { $regex: escapeRegex(filters.name), $options: 'i' };
    }
    if (filters.code) {
        where.code = filters.code;
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

    //2: validate tenant exists
    const tenant = await TenantService.get(model.tenant, ctx);
    if (!tenant) {
        throwAppError('Tenant not found', StatusCodes.NOT_FOUND);
    }

    //3: create permission group
    const entity = new PermissionGroupModel({
        code: model.code,
        tenant: toObjectId(model.tenant),
    });

    //4: set rest fields
    permissionGroup = await set(model, entity, ctx);
    permissionGroup = await permissionGroup.save();

    return permissionGroup;
};

const update = async (id: string, model: IUpdatePermissionGroupPayload, ctx: RequestContext) => {
    //1: get permission group first
    let permissionGroup: PermissionGroupDocument = null;
    permissionGroup = await PermissionGroupService.get(id, ctx, { scopeToTenant: true });
    if (!permissionGroup) {
        return throwAppError('Permission group not found', StatusCodes.NOT_FOUND);
    }

    //1.1: the system permission group is immutable — it can never be modified through the API,
    //no matter who the actor is (including the system user). It is owned by the seed only.
    if (permissionGroup.code === ENV.App.SystemTenantCode) {
        return throwAppError('The system permission group cannot be modified', StatusCodes.FORBIDDEN);
    }

    //2: update incoming fields
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
    // system:manage is a seed-only skeleton key — it can never be granted to any permission
    // group through the API, no matter who the actor is (including the system user).
    if (model.permissions.some((permission: any) => permission.code === SYSTEM_PERMISSIONS.MANAGE.code)) {
        throwAppError(`${SYSTEM_PERMISSIONS.MANAGE.code} cannot be assigned to a permission group`, StatusCodes.FORBIDDEN);
    }

    // check if permisisons are valid by system
    let inValidPermissions = model.permissions.filter((permission: any) => !PERMISSIONS_ARRAY.includes(permission.code));
    if (inValidPermissions.length > 0) {
        throwAppError(`Invalid permissions: ${inValidPermissions.map((p: any) => p.code).join(', ')}`, StatusCodes.BAD_REQUEST);
    }

    //check if permissions are allowed by permission group of the one who is updating(admin)
    let permissionGroup: any = await PermissionGroupService.search({ tenant: ctx.tenant._id }, ctx);
    if (permissionGroup.count == 0) {
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
