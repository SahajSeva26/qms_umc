import mongoose, { HydratedDocument } from 'mongoose';
import { ITenant, TenantModel } from './tenant.model';
import { ICreateTenantPayload, ISearchTenantQuery, IUpdateTenantPayload } from './tenant.validators';
import { TENANT_PERMISSIONS, TENANT_STATUS, TENANT_TYPE } from './tenant.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { RoleService } from '../role/role.service';
import { PermissionGroupService } from '../permission-group/permissionGroup.service';
import { USER_PERMISSIONS, USER_STATUS } from '../../user/user.constants';
import { DEFAULT_PHARMA_ROLE_TYPES } from '../role-type/roleType.constants';
import { IServiceOptions } from '../../../shared/types/service.types';
import { withTransaction } from '../../../shared/helpers/transactionHelper';
import { provisionDefaultRoleTypes } from '../../../shared/env/roleTypeProvisioner';
import { SYSTEM_PERMISSIONS } from '../../../shared/env/permissions';
import { IUser, UserModel } from '../../user/user.model';

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

    // if (model.type && ctx.hasAnyPermissions([SYSTEM_PERMISSIONS.MANAGE.code])) {
    //     //only system user shoudld be able to do that
    //     entity.type = model.type;
    // }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<TenantDocument> => {
    //1: add default scoping
    let where: mongoose.QueryFilter<ITenant> = {};

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
            log.debug({ tenantId: tenant._id }, 'Tenant created');

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
            log.debug({ permissionGroupId: permissionGroup._id }, 'Permission group created');

            //3: create the tenant admin role type as a fixed default via the direct provisioner
            // (isSystem: true). The service path can't set isSystem — that would leave this as an
            // editable, isSystem:false role type, inconsistent with the system tenant's admin role
            // type and outside the future reset-to-default scope. Provisioned like the pharma
            // defaults so all platform-curated role types are uniform.
            const [roleType] = await provisionDefaultRoleTypes(tenant, [
                {
                    code: `${tenant.code}.admin`,
                    name: `${tenant.name}'s admin role type`,
                    description: `${tenant.name}'s admin role type`,
                    permissions: [TENANT_PERMISSIONS.ADMIN.code],
                },
            ]);
            if (!roleType) {
                return throwAppError('Failed to provision admin role type', StatusCodes.INTERNAL_SERVER_ERROR);
            }
            log.debug({ roleTypeId: roleType._id }, 'Admin role type provisioned');

            //3.1: provision the fixed default (pharma) role types for CUSTOMER tenants. Created
            // directly with isSystem:true so their codes are reserved; the pharma admin then only
            // creates roles derived from them, never the role types themselves.
            if (tenant.type === TENANT_TYPE.CUSTOMER) {
                await provisionDefaultRoleTypes(tenant, DEFAULT_PHARMA_ROLE_TYPES);
                log.debug({ tenantId: tenant._id }, 'Default pharma role types provisioned');
            }

            //4: create role (RoleService.create creates + links the owner user)
            const role = await RoleService.create(
                {
                    code: `${tenant.code}.admin`,
                    name: `${tenant.name}'s admin role`,
                    description: `${tenant.name}'s admin role`,
                    tenant: tenant._id.toString(),
                    type: roleType.id,
                    user: model.owner,
                    permissions: [],
                },
                ctx,
            );
            log.debug({ roleId: role._id }, 'Role created');

            //5: activate the owner user. UserService.create (via RoleService.create) forces every
            // new user INACTIVE — the deliberate admin-driven register default. But the owner minted
            // during onboarding must be able to log in immediately, mirroring the seeded platform
            // admin (created active). Done directly on the model, in the same transaction, so it
            // bypasses the user:manage status gate for this trusted bootstrap step only. The owner is
            // always a brand-new account (RoleService.create 409s if the email already exists), so
            // there's no risk of flipping a pre-existing user active.
            await UserModel.updateOne({ _id: role.user }, { status: USER_STATUS.ACTIVE });
            log.debug({ userId: role.user }, 'Owner user activated');

            //6: update tenant owner
            tenant.owner = role._id;
            tenant = await tenant.save();
            log.debug({ tenantId: tenant._id }, 'Tenant owner updated');
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
