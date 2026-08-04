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
import { DivisionService } from '../../crm/division/division.service';
import { PERMISSIONS_ARRAY, SYSTEM_PERMISSIONS } from '../../../shared/env/permissions';
import { IServiceOptions } from '../../../shared/types/service.types';
import { PermissionGroupModel } from '../permission-group/permissionGroup.model';
import { TENANT_PERMISSIONS, TENANT_TYPE } from '../tenant/tenant.constants';
import { withTransaction } from '../../../shared/helpers/transactionHelper';
import { isValidRoleSupervisor, ROLE_SUPERVISOR_TREE } from './role.constants';

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
    {
        path: 'supervisor',
        select: 'code name type tenant division',
    },
];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================
const set = async (model: any, entity: HydratedDocument<IRoleDocument>, ctx: RequestContext) => {
    // lazy, cached role-type resolver — fetched at most ONCE per set(), and only if a consumer below
    // (type validation, the single-admin guard, or the supervisor tree checks) actually needs it. A
    // name-only update therefore triggers zero role-type lookups. Prefers the incoming type
    // (create / type-change), else the role's existing type.
    let cachedRoleType: any;
    let roleTypeResolved = false;
    const getRoleType = async () => {
        if (!roleTypeResolved) {
            const typeId = model.type || entity.type?.toString();
            cachedRoleType = typeId ? await RoleTypeService.get(typeId, ctx) : null;
            roleTypeResolved = true;
        }
        return cachedRoleType;
    };

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
        const roleType: any = await getRoleType();
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

    if (model.division) {
        // the division must exist AND belong to the role's own tenant (coherence) — a mismatch
        const division: any = await DivisionService.get(model.division, ctx, { populate: true });
        if (!division || division.tenant._id.toString() !== entity.tenant.toString()) {
            throwAppError('Division not found', StatusCodes.NOT_FOUND);
        }
        // a division may only be assigned to a role on a customer-type tenant
        if (division.tenant.type !== TENANT_TYPE.CUSTOMER) {
            throwAppError('Division can only be assigned to a customer tenant', StatusCodes.BAD_REQUEST);
        }
        entity.division = toObjectId(model.division);
    }

    // validate a passed supervisor against the tree (create + update); on CREATE also require one for
    // any role the tree places under a parent. Reuses the cached role type resolved above.
    await handleSupervisor(model, entity, ctx, getRoleType);

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

    // `user` is a free-text keyword → resolve against the linked user (name/email) via the user
    // service, then match roles by their `user` field. The role query still runs under ctx.where(),
    // so a foreign-tenant user id in the list matches no role — no cross-tenant leak. No match yields
    // $in [] which correctly returns zero roles.
    if (filters.user) {
        const [byName, byEmail] = await Promise.all([
            UserService.search({ name: filters.user }, ctx),
            UserService.search({ email: filters.user }, ctx),
        ]);
        const userIds = [...byName.items, ...byEmail.items].map((user) => user._id);
        where.user = { $in: userIds };
    }

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
    if (filters.division) {
        where.division = toObjectId(filters.division);
    }
    if (filters.supervisor) {
        where.supervisor = toObjectId(filters.supervisor);
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

const handleSupervisor = async (
    model: any,
    entity: HydratedDocument<IRoleDocument>,
    ctx: RequestContext,
    getRoleType: () => Promise<any>,
) => {
    // no supervisor supplied
    if (!model.supervisor) {
        // required on CREATE only, and only for a role the tree places under a parent. Roots (no/empty
        // ROLE_SUPERVISOR_TREE entry) are exempt, so seeded/onboarding roots create fine. Updates never
        // force one (entity.isNew is false), keeping supervisor optional on update.
        if (entity.isNew) {
            const roleType: any = await getRoleType();
            const allowed: string[] = ROLE_SUPERVISOR_TREE[roleType?.code] || [];
            if (allowed.length > 0) {
                throwAppError('A supervisor is required for this role', StatusCodes.BAD_REQUEST);
            }
        }
        return;
    }

    // a role cannot report to itself
    if (model.supervisor === entity._id.toString()) {
        throwAppError('A role cannot be its own supervisor', StatusCodes.BAD_REQUEST);
    }

    // the manager (supervisor) must exist and be visible to the actor
    const supervisor: any = await RoleService.get(model.supervisor, ctx, { populate: true });
    if (!supervisor) {
        throwAppError('Supervisor not found', StatusCodes.NOT_FOUND);
    }

    // and belong to the role's own tenant — a role only reports to someone inside the same company
    if (supervisor.tenant?._id?.toString() !== entity.tenant.toString()) {
        throwAppError('Supervisor must belong to the same tenant', StatusCodes.BAD_REQUEST);
    }

    // the supervisor's role type must be one the tree allows for this role. A role type with no/empty
    // ROLE_SUPERVISOR_TREE entry is a root — isValidRoleSupervisor returns true there, so a passed
    // supervisor is accepted; when the tree DOES list allowed parents, only those role types pass.
    const roleType: any = await getRoleType();
    if (!isValidRoleSupervisor(roleType?.code, supervisor.type?.code)) {
        const allowed: string[] = ROLE_SUPERVISOR_TREE[roleType?.code] || [];
        throwAppError(`This role can only report to: ${allowed.join(', ')}`, StatusCodes.BAD_REQUEST);
    }

    entity.supervisor = toObjectId(model.supervisor);
};
