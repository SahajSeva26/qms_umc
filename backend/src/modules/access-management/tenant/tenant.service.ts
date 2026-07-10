import mongoose, { HydratedDocument } from 'mongoose';
import { ITenant, TenantModel } from './tenant.model';
import { ICreateTenantPayload, ISearchTenantQuery, IUpdateTenantPayload } from './tenant.validators';
import { TENANT_PERMISSIONS, TENANT_STATUS } from './tenant.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { RoleService } from '../role/role.service';
import { UserService } from '../../user/user.service';
import { PermissionGroupService } from '../permission-group/permissionGroup.service';
import { USER_PERMISSIONS } from '../../user/user.constants';
import { RoleTypeService } from '../role-type/roleType.service';
import { IServiceOptions } from '../../../shared/types/service.types';
import { withTransaction } from '../../../shared/helpers/transactionHelper';
import { SYSTEM_PERMISSIONS } from '../../../shared/env/permissions';

type TenantDocument = HydratedDocument<ITenant> | null;
const populate: any[] = [];
// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<ITenant>, ctx: RequestContext) => {
    if (model.name) {
        entity.name = model.name;
    }

    if (model.description) {
        entity.description = model.description;
    }

    if (model.status && ctx.hasAnyPermissions([TENANT_PERMISSIONS.MANAGE.code])) {
        entity.status = model.status;
    }

    if (model.type && ctx.hasAnyPermissions([SYSTEM_PERMISSIONS.MANAGE.code])) {
        //only system user shoudld be able to do that
        entity.type = model.type;
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<TenantDocument> => {
    //1: add default scoping
    let where: mongoose.QueryFilter<ITenant> ={ };

    let query = null;

    if (isValidObjectID(id)) {
        where._id = id;
        query = TenantModel.findOne({ ...where });
    } else {
        where.code = id;
        query = TenantModel.findOne({ ...where });
    }

    if (query) {
        if (options?.populate) {
            query = query.populate(populate);
        }
    }

    return await query;
};

const search = async (filters: ISearchTenantQuery, ctx: RequestContext, options?: IServiceOptions) => {
    let sort: any = {
        createdAt: -1,
    };

    //1: add default scoping
    let where: mongoose.QueryFilter<ITenant> = ctx.where();
    where.status = TENANT_STATUS.ACTIVE;

    //2: add search filters
    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.code) {
        where.code = { $regex: filters.code, $options: 'i' };
    }
    if (filters.status && ctx.hasAnyPermissions([TENANT_PERMISSIONS.MANAGE.code])) {
        where.status = filters.status;
    }

    // 3: execute queries
    const countPromise = TenantModel.countDocuments(where);
    const dataPromise = TenantModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return {
        count,
        items,
    };
};

const create = async (model: ICreateTenantPayload, ctx: RequestContext): Promise<HydratedDocument<ITenant>> => {
    let tenant: TenantDocument = null;

    //1: check existing tenant
    tenant = await TenantService.get(model.code, ctx);
    if (tenant) {
        return throwAppError('Tenant with this code already exists', StatusCodes.CONFLICT);
    }

    //2: create tenant
    const entity = new TenantModel({
        code: model.code, //immutable
    });

    //3: set remaining fields
    tenant = await set(model, entity, ctx);
    tenant = await tenant.save();

    return tenant;
};

const update = async (id: string, model: IUpdateTenantPayload, ctx: RequestContext) => {
    //1: get tenant first
    let tenant: TenantDocument = null;
    tenant = await TenantService.get(id, ctx);
    if (!tenant) {
        return throwAppError('Tenant not found', StatusCodes.NOT_FOUND);
    }

    //2: update tenant
    tenant = await set(model, tenant, ctx);
    tenant = await tenant.save();

    //3: return tenant
    return tenant;
};

// transaction: create tenant + its permission group, role type, owner user & role.
// All writes inside `withTransaction` share one session (auto-injected by Mongoose),
// so if any step throws the whole thing rolls back — no orphaned records.
const createTenant = async (model: ICreateTenantPayload, ctx: RequestContext) => {
    const log = ctx.logger;
    try {
        return await withTransaction(async () => {
            //1: create tenant
            let tenant: any = await create(model, ctx);
            log.debug('Tenant created', { tenantId: tenant._id });

            //2: create permission group
            const permissionGroup = await PermissionGroupService.create(
                {
                    code: `${tenant.code}`,
                    name: `${tenant.name}'s permission group`,
                    description: `${tenant.name}'s permission group`,
                    tenant: tenant._id.toString(),
                    permissions: [
                        //all default bare minimum permisions boundary for a tenant
                        // TENANT_PERMISSIONS.ADMIN,
                        USER_PERMISSIONS.GET,
                        USER_PERMISSIONS.SEARCH,
                        USER_PERMISSIONS.UPDATE,
                    ],
                },
                ctx,
            );
            log.debug('Permission group created', { permissionGroupId: permissionGroup._id });

            //3: create role type
            const roleType = await RoleTypeService.create(
                {
                    code: `${tenant.code}.admin`,
                    name: `${tenant.name}'s admin role type`,
                    description: `${tenant.name}'s admin role type`,
                    tenant: tenant._id.toString(),
                    permissions: [TENANT_PERMISSIONS.ADMIN.code],
                },
                ctx,
            );
            log.debug('Role type created', { roleTypeId: roleType._id });

            //4: create user
            const user = await UserService.create(model.owner, ctx);
            log.debug('User created', { userId: user._id });

            //5: create role
            const role = await RoleService.create(
                {
                    code: `${tenant.code}.admin`,
                    name: `${tenant.name}'s admin role`,
                    description: `${tenant.name}'s admin role`,
                    tenant: tenant._id.toString(),
                    type: roleType.id,
                    user: user.id,
                    permissions: [TENANT_PERMISSIONS.ADMIN.code],
                },
                ctx,
            );
            log.debug('Role created', { roleId: role._id });

            //6: update tenant owner
            tenant.owner = role._id;
            tenant = await tenant.save();
            log.debug('Tenant owner updated', { tenantId: tenant._id });
            return tenant;
        });
    } catch (error: any) {
        log.error('Tenant creation transaction failed:', error?.message);
        return throwAppError(error?.message || 'Failed to create tenant', error?.statusCode || StatusCodes.BAD_REQUEST);
    }
};

export const TenantService = {
    get,
    search,
    create: createTenant,
    update,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
