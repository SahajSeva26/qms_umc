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
import { TENANT_PERMISSIONS } from '../tenant/tenant.constants';

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

    if (model.status) {
        if (!ctx.hasAnyPermissions([TENANT_PERMISSIONS.ADMIN.code, TENANT_PERMISSIONS.MANAGE.code])) {
            throwAppError('Forbidden: you are not allowed to update status', StatusCodes.FORBIDDEN);
        }
        entity.status = model.status;
    }

    if (model.permissions != undefined) {
        if (!ctx.hasAnyPermissions([TENANT_PERMISSIONS.ADMIN.code, TENANT_PERMISSIONS.MANAGE.code])) {
            throwAppError('Forbidden: you are not allowed to update permissions', StatusCodes.FORBIDDEN);
        }
        // system:manage is a seed-only skeleton key. It can never be granted through the API...
        if (model.permissions.includes(SYSTEM_PERMISSIONS.MANAGE.code)) {
            throwAppError(`${SYSTEM_PERMISSIONS.MANAGE.code} cannot be assigned to a role type`, StatusCodes.FORBIDDEN);
        }
        // ...and it can never be stripped from a role type that already carries it (e.g. the
        // seeded system role type), including via an empty-array wipe. Freezes it in place.
        if (entity.permissions.includes(SYSTEM_PERMISSIONS.MANAGE.code)) {
            throwAppError('The permissions of a system-managed role type cannot be modified', StatusCodes.FORBIDDEN);
        }
        //allowing empty [] array for update
        if (model.permissions.length > 0) {
            if (await handlePermissionUpdate(model, entity, ctx)) {
                entity.permissions = model.permissions;
            }
        }
        if (model.permissions.length === 0) {
            entity.permissions = [];
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
        where.code = filters.code;
    }

    if (filters.status && ctx.hasAnyPermissions([TENANT_PERMISSIONS.ADMIN.code, TENANT_PERMISSIONS.MANAGE.code])) {
        where.status = filters.status;
    }
    if (filters.tenant && ctx.hasAnyPermissions([TENANT_PERMISSIONS.MANAGE.code])) {
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

    //2: check the scoping creation
    if (!ctx.hasAnyPermissions([TENANT_PERMISSIONS.MANAGE.code]) && tenant.owner?.toString() != ctx.role?._id.toString()) {
        //only system user or tenant owner should be able to do that
        return throwAppError('Forbidden: You do not have permission to create a role type for this tenant', StatusCodes.FORBIDDEN);
    }
    //3: reserved-code guard — a system/default role type's code cannot be reused by a custom one.
    // Checked UNSCOPED (not via ctx.where()) because system role types live on the platform tenant
    // (and pharma defaults on each customer tenant), which the actor's scope would not see. This
    // replaces the old allow-list enum as the protector of reserved codes now that codes are free-form.
    const reserved = await RoleTypeModel.findOne({ code: model.code, isSystem: true });
    if (reserved) {
        return throwAppError('This role type code is reserved and cannot be used', StatusCodes.CONFLICT);
    }

    //4: check for duplicate code within the tenant
    const result = await RoleTypeService.search({ code: model.code, tenant: model.tenant }, ctx);
    if (result.count > 0) {
        return throwAppError('Role type with this code already exists, for this tenant', StatusCodes.CONFLICT);
    }

    //4: create role type
    const entity = new RoleTypeModel({
        code: model.code,
        tenant: tenant._id,
    });

    //5: set remaining fields
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
    let permissionGroup: any = await PermissionGroupService.search({ tenant: ctx.tenant._id }, ctx);
    if (permissionGroup.count == 0) {
        log.error('Permission group not found');
        throwAppError('Permission group not found', StatusCodes.NOT_FOUND);
    }
    permissionGroup = permissionGroup.items[0];

    // 4: flat permissions of  permision group
    const allowedGroupPermissions = permissionGroup.permissions.map((permission: any) => permission.code);
    const inValidGroupPermissions = model.permissions.filter((permission: any) => !allowedGroupPermissions.includes(permission));
    if (inValidGroupPermissions.length > 0) {
        log.error(`Invalid group permissions update: ${inValidGroupPermissions.join(', ')}`);
        throwAppError(`Invalid permissions: ${inValidGroupPermissions.join(', ')}`, StatusCodes.BAD_REQUEST);
    }

    log.info('Permissions validated successfully');
    return true;
};
