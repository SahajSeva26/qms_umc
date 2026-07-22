import mongoose, { HydratedDocument } from 'mongoose';
import { RoleModel, RoleDocument as IRoleDocument } from './role.model';
import { ICreateRolePayload, ISearchRoleQuery, IUpdateRolePayload } from './role.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { toObjectId, isValidObjectID } from '../../../shared/utils/strings';
import { TenantService } from '../tenant/tenant.service';
import { RoleTypeService } from '../role-type/roleType.service';
import { UserService } from '../../user/user.service';
import { PERMISSIONS_ARRAY, SYSTEM_PERMISSIONS } from '../../../shared/env/permissions';
import { IServiceOptions } from '../../../shared/types/service.types';
import { PermissionGroupModel } from '../permission-group/permissionGroup.model';
import { TENANT_PERMISSIONS } from '../tenant/tenant.constants';
import { withTransaction } from '../../../shared/helpers/transactionHelper';

type RoleDoc = HydratedDocument<IRoleDocument> | null;
const populate: any[] = [
    {
        path: 'type',
        select: 'name code permissions',
    },
    {
        path: 'tenant',
        select: 'name code type status',
    },
    {
        path: 'user',
        select: 'firstName lastName email phone gender status',
    },
];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================
const set = async (model: any, entity: HydratedDocument<IRoleDocument>, ctx: RequestContext) => {
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
    if (model.type) {
        // the incoming role type must exist AND belong to the role's own tenant — a mismatch
        // returns a vague 404 on purpose, so a tenant admin cannot discover role types elsewhere.
        // Comparing against entity.tenant (not ctx) also constrains a system user to the role's tenant.
        // (admin / tenant:manage access is already enforced by the create + update route guards)
        const roleType: any = await RoleTypeService.get(model.type, ctx);
        if (!roleType || roleType.tenant.toString() !== entity.tenant.toString()) {
            throwAppError('Role type not found', StatusCodes.NOT_FOUND);
        }

        // if this is the admin role type, it may back at most one role — reject a second admin
        if (roleType.permissions.includes(TENANT_PERMISSIONS.ADMIN.code)) {
            const existingRole = await RoleModel.findOne({
                type: toObjectId(roleType._id),
                _id: { $ne: entity._id }, // exclude self so onboarding create / admin self-edit pass
            });
            if (existingRole) {
                throwAppError('An admin role already exists for this tenant', StatusCodes.CONFLICT);
            }
        }

        entity.type = toObjectId(model.type);
    }

    if (model.permissions && model.permissions.length > 0) {
        await handlePermissionUpdate(model, ctx);
        entity.permissions = model.permissions;
    }

    if (model.user) {
        if (entity.user) {
            //its an update call
            const userID = entity.user.toString();
            await UserService.update(userID, model.user, ctx);
        } else {
            //its create call
            const user = await UserService.create(model.user, ctx);
            entity.user = user._id;
        }
    }

    // Reassignment: hand this SAME role document to a different existing
    // user (e.g. the tenant-admin role moving from one person to another).
    // Distinct from `model.user` above, which only ever edits the fields of
    // whoever is CURRENTLY linked — this swaps who's linked. The role type
    // itself is never touched; only `entity.user` changes, so any
    // permissions/config living on the role type carry over automatically
    // to the new holder.
    if (model.userId) {
        // UserService.get() is deliberately called WITHOUT scopeToTenant here
        // (unlike model.user's UserService.update path) — scopeToTenant only
        // matches users who ALREADY hold a Role in this tenant, which would
        // make it impossible to reassign to someone genuinely new to the
        // company. Instead, guard the real risk directly: a user who already
        // holds a Role in a DIFFERENT tenant must not be silently pulled in —
        // there is no invite/consent flow in this system, so cross-tenant
        // reassignment would otherwise let this tenant's admin unilaterally
        // bind a stranger from another company's tenant to this role.
        const newUser = await UserService.get(model.userId, ctx);
        if (!newUser) {
            return throwAppError('User not found', StatusCodes.NOT_FOUND);
        }

        const existingRoleElsewhere = await RoleModel.findOne({
            user: newUser._id,
            tenant: { $ne: entity.tenant },
        }).lean();
        if (existingRoleElsewhere) {
            throwAppError('This user already belongs to a different tenant and cannot be reassigned here', StatusCodes.CONFLICT);
        }

        entity.user = toObjectId(model.userId);
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<RoleDoc> => {
    const where: mongoose.QueryFilter<IRoleDocument> = ctx.where();
    let entity = null;

    if (isValidObjectID(id)) {
        where._id = id;
        entity = RoleModel.findOne(where);
    } else {
        where.code = id;
        entity = RoleModel.findOne(where);
    }

    if (entity && options?.populate) {
        entity = entity.populate(populate);
    }

    return await entity;
};

const search = async (filters: ISearchRoleQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    const where: mongoose.QueryFilter<IRoleDocument> = ctx.where();

    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
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
    if (filters.type) {
        where.type = toObjectId(filters.type);
    }
    if (filters.user) {
        where.user = toObjectId(filters.user);
    }

    const countPromise = RoleModel.countDocuments(where);
    const dataPromise = RoleModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateRolePayload, ctx: RequestContext): Promise<HydratedDocument<IRoleDocument>> => {
    let role: RoleDoc = null;

    //1: validate tenant exists
    const tenantPromise = TenantService.get(model.tenant, ctx);

    //3: check for duplicate code
    const existingRolePromise = RoleService.get(model.code, ctx);

    let [tenant, existingRole] = await Promise.all([tenantPromise, existingRolePromise]);

    if (!tenant) {
        return throwAppError('Tenant not found', StatusCodes.NOT_FOUND);
    }

    if (existingRole) {
        return throwAppError('Role with this code already exists', StatusCodes.CONFLICT);
    }

    //5: create user + role together — rolls back if either fails
    role = await withTransaction(async () => {
        const entity = new RoleModel({
            tenant: toObjectId(model.tenant),
        });

        //6: set remaining fields (creates + links the user)
        const r = await set(model, entity, ctx);
        return await r.save();
    });

    return role;
};

const update = async (id: string, model: IUpdateRolePayload, ctx: RequestContext) => {
    //1: get role first
    let role: RoleDoc = null;
    role = await RoleService.get(id, ctx);
    if (!role) {
        return throwAppError('Role not found', StatusCodes.NOT_FOUND);
    }

    //2: update user + role together — rolls back if either fails
    role = await withTransaction(async () => {
        //set() validates the role type, enforces the single-admin guard, and updates the linked user
        const r = await set(model, role!, ctx);
        return await r.save();
    });

    return role;
};

export const RoleService = {
    get,
    search,
    create,
    update,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
// a role may NEVER directly hold these elevated permissions — they belong on a role type only
const ROLE_FORBIDDEN_PERMISSIONS = [TENANT_PERMISSIONS.ADMIN.code, TENANT_PERMISSIONS.MANAGE.code, SYSTEM_PERMISSIONS.MANAGE.code];

const handlePermissionUpdate = async (model: any, ctx: RequestContext) => {
    const log = ctx.logger;
    if (!model.permissions?.length) return true;

    //1: check if permissions are valid system permission codes
    const inValidPermissions = model.permissions.filter((permission: any) => !PERMISSIONS_ARRAY.includes(permission));
    if (inValidPermissions.length > 0) {
        log.error(`Invalid system permissions update: ${inValidPermissions.join(', ')}`);
        throwAppError(`Invalid permissions: ${inValidPermissions.join(', ')}`, StatusCodes.BAD_REQUEST);
    }

    //2: denylist — a role can never directly hold elevated permissions (no bypass, applies even to system)
    const forbiddenPermissions = model.permissions.filter((permission: any) => ROLE_FORBIDDEN_PERMISSIONS.includes(permission));
    if (forbiddenPermissions.length > 0) {
        log.error(`Attempt to grant elevated permissions to a role: ${forbiddenPermissions.join(', ')}`);
        throwAppError(`A role cannot directly hold elevated permissions: ${forbiddenPermissions.join(', ')}`, StatusCodes.FORBIDDEN);
    }

    //3: early return if system.manage is true — system bypasses the permission group ceiling
    if (ctx.hasAnyPermissions([SYSTEM_PERMISSIONS.MANAGE.code])) {
        log.info('Creator has system manage permission, skipping permission group validation');
        return true;
    }

    //4: check if permissions are allowed by the actor's tenant permission group.
    // Use a single findOne, NOT PermissionGroupService.search: this runs inside RoleService's
    // create/update transaction, and search() fires count+find as a Promise.all — two parallel
    // ops on the one transactional session, which MongoDB rejects ("cannot start a new
    // transaction at the active transaction number"). sort keeps the most-recent-PG semantics
    // that search()+items[0] had.
    const permissionGroup: any = await PermissionGroupModel.findOne({ tenant: ctx.tenant._id }).sort({ createdAt: -1 });
    if (!permissionGroup) {
        log.error('Permission group not found');
        throwAppError('Permission group not found', StatusCodes.NOT_FOUND);
    }

    const allowedGroupPermissions = permissionGroup.permissions.map((permission: any) => permission.code);
    const inValidGroupPermissions = model.permissions.filter((permission: any) => !allowedGroupPermissions.includes(permission));
    if (inValidGroupPermissions.length > 0) {
        log.error(`Invalid group permissions update: ${inValidGroupPermissions.join(', ')}`);
        throwAppError(`Invalid permissions: ${inValidGroupPermissions.join(', ')}`, StatusCodes.BAD_REQUEST);
    }

    log.info('Permissions validated successfully');
    return true;
};
