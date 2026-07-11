import mongoose, { HydratedDocument } from 'mongoose';
import { IRoleType, RoleTypeModel } from './roleType.model';
import { ICreateRoleTypePayload, ISearchRoleTypeQuery, IUpdateRoleTypePayload } from './roleType.validators';
import { ROLE_TYPE_PERMISSIONS, ROLE_TYPE_STATUSES } from './roleType.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { toObjectId, isValidObjectID } from '../../../shared/utils/strings';
import { TenantService } from '../tenant/tenant.service';
import { PERMISSIONS_ARRAY, SYSTEM_PERMISSIONS } from '../../../shared/env/permissions';
import { IServiceOptions } from '../../../shared/types/service.types';
import { PermissionGroupService } from '../permission-group/permissionGroup.service';

type RoleTypeDocument = HydratedDocument<IRoleType> | null;
const populate: any[] = [
    {
        path: 'tenant',
        select: 'name code',
    },
];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<IRoleType>, ctx: RequestContext) => {
    if (model.name) {
        entity.name = model.name;
    }
    if (model.description) {
        entity.description = model.description;
    }

    if (model.status && ctx.hasAnyPermissions([ROLE_TYPE_PERMISSIONS.MANAGE.code])) {
        entity.status = model.status;
    }
    if (model.permissions && model.permissions.length > 0) {
        if (await handlePermissionUpdate(model, entity, ctx)) {
            entity.permissions = model.permissions;
        }
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<RoleTypeDocument> => {
    let query = null;
    let where: mongoose.QueryFilter<IRoleType> = { ...ctx.where() };

    if (isValidObjectID(id)) {
        where._id = id;
        query = RoleTypeModel.findOne(where);
    } else {
        where.code = id;
        query = RoleTypeModel.findOne(where);
    }

    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchRoleTypeQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    const where: mongoose.QueryFilter<IRoleType> = { ...ctx.where() };

    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.code) {
        where.code = { $regex: filters.code, $options: 'i' };
    }
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.tenant && ctx.hasAnyPermissions([ROLE_TYPE_PERMISSIONS.MANAGE.code])) {
        where.tenant = toObjectId(filters.tenant);
    }

    const countPromise = RoleTypeModel.countDocuments(where);

    const dataPromise = RoleTypeModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (
    model: ICreateRoleTypePayload,
    ctx: RequestContext,
    options?: IServiceOptions,
): Promise<HydratedDocument<IRoleType>> => {
    let roleType: RoleTypeDocument = null;

    //1: validate tenant exists
    const tenant = await TenantService.get(model.tenant, ctx);
    if (!tenant) {
        return throwAppError('Tenant not found', StatusCodes.NOT_FOUND);
    }

    //2: check for duplicate code
    const result = await RoleTypeService.get(model.code, ctx);
    if (result) {
        return throwAppError('Role type with this code already exists, for this tenant', StatusCodes.CONFLICT);
    }

    //3: create role type
    const entity = new RoleTypeModel({
        code: model.code,
        tenant: tenant._id,
    });

    //4: set remaining fields
    roleType = await set(model, entity, ctx);
    roleType = await roleType.save();

    return roleType;
};

const update = async (id: string, model: IUpdateRoleTypePayload, ctx: RequestContext) => {
    //1: get role type first
    let roleType: RoleTypeDocument = null;
    roleType = await RoleTypeService.get(id, ctx);
    if (!roleType) {
        return throwAppError('Role type not found', StatusCodes.NOT_FOUND);
    }

    //2: update role type
    roleType = await set(model, roleType, ctx);
    roleType = await roleType.save();

    //3: return role type
    return roleType;
};

export const RoleTypeService = {
    get,
    search,
    create,
    update,
};

// ========================================================================================
// EXPORTS
// ========================================================================================

const handlePermissionUpdate = async (model: any, entity: RoleTypeDocument, ctx: RequestContext) => {
    const log = ctx.logger;
    //1: check if permisisons are valid by system
    let inValidPermissions = model.permissions?.filter((permission: any) => !PERMISSIONS_ARRAY.includes(permission));
    if (inValidPermissions?.length > 0) {
        log.error(`Invalid system permissions update: ${inValidPermissions.join(', ')}`);
        throwAppError(`Invalid permissions: ${inValidPermissions.join(', ')}`, StatusCodes.BAD_REQUEST);
    }

    // 3:check if permissions are allowed by permission group
    //TODO: also we can get by code,
    //FIXME: need to handle this case
    let permissionGroup: any = await PermissionGroupService.search({ tenant: entity?.tenant?.toString() || "" }, ctx);
    if (permissionGroup.count == 0) {
        log.error('Permission group not found');
        throwAppError('Permission group not found', StatusCodes.NOT_FOUND);
    }
    permissionGroup = permissionGroup.items[0];
    //flat permissions of  permision group

    const allowedGroupPermissions = permissionGroup.permissions.map((permission: any) => permission.code);
    const inValidGroupPermissions = model.permissions.filter((permission: any) => !allowedGroupPermissions.includes(permission));
    if (inValidGroupPermissions.length > 0) {
        log.error(`Invalid group permissions update: ${inValidGroupPermissions.join(', ')}`);
        throwAppError(`Invalid permissions: ${inValidGroupPermissions.join(', ')}`, StatusCodes.BAD_REQUEST);
    }

    log.info('Permissions validated successfully');
    return true;
};
