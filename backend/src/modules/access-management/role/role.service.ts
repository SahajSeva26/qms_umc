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
import { PERMISSIONS_ARRAY } from '../../../shared/env/permissions';

type RoleDoc = HydratedDocument<IRoleDocument> | null;
const populate: any[] = [
    {
        path: 'type',
        select: 'name code permissions',
    },
    {
        path: 'tenant',
        select: 'name code',
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
    if (model.permissions && model.permissions.length > 0) {
        const inValidPermissions = model.permissions.filter((p: string) => !PERMISSIONS_ARRAY.includes(p));
        if (inValidPermissions.length > 0) {
            throwAppError(`Invalid permissions: ${inValidPermissions.join(', ')}`, StatusCodes.BAD_REQUEST);
        }
        entity.permissions = model.permissions;
    }
    if (model.status) {
        entity.status = model.status;
    }
    if (model.type) {
        entity.type = toObjectId(model.type);
    }
    if (model.tenant) {
        entity.tenant = toObjectId(model.tenant);
    }
    if (model.user) {
        entity.user = toObjectId(model.user);
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: any): Promise<RoleDoc> => {
    let query = null;

    if (isValidObjectID(id)) {
        query = RoleModel.findOne({ _id: id });
    } else {
        query = RoleModel.findOne({ code: id });
    }

    if (query && options) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchRoleQuery, ctx: RequestContext, options?: any) => {
    const sort: any = { createdAt: -1 };

    const where: mongoose.QueryFilter<IRoleDocument> = {};

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
    if (filters.type) {
        where.type = toObjectId(filters.type);
    }
    if (filters.user) {
        where.user = toObjectId(filters.user);
    }

    const countPromise = RoleModel.countDocuments(where);
    const dataPromise = RoleModel.find(where).populate(populate).limit(options?.pagination?.limit).skip(options?.pagination?.skip).sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateRolePayload, ctx: RequestContext): Promise<HydratedDocument<IRoleDocument>> => {
    let role: RoleDoc = null;

    //1: validate tenant exists
    const tenant = await TenantService.get(model.tenant, ctx);
    if (!tenant) {
        return throwAppError('Tenant not found', StatusCodes.NOT_FOUND);
    }

    //2: validate role type exists
    const roleType = await RoleTypeService.get(model.type, ctx);
    if (!roleType) {
        return throwAppError('Role type not found', StatusCodes.NOT_FOUND);
    }

    //3: validate user exists
    const user = await UserService.get(model.user, ctx);
    if (!user) {
        return throwAppError('User not found', StatusCodes.NOT_FOUND);
    }

    //4: check for duplicate code
    const existing = await RoleService.get(model.code, ctx);
    if (existing) {
        return throwAppError('Role with this code already exists', StatusCodes.CONFLICT);
    }

    //5: create role
    const entity = new RoleModel({
        tenant: toObjectId(model.tenant),
        user: toObjectId(model.user),
    });

    //6: set remaining fields
    role = await set(model, entity, ctx);
    role = await role.save();

    return role;
};

const update = async (id: string, model: IUpdateRolePayload, ctx: RequestContext) => {
    //1: get role first
    let role: RoleDoc = null;
    role = await RoleService.get(id, ctx);
    if (!role) {
        return throwAppError('Role not found', StatusCodes.NOT_FOUND);
    }

    //2: validate role type exists if being updated
    if (model.type) {
        const roleType = await RoleTypeService.get(model.type, ctx);
        if (!roleType) {
            return throwAppError('Role type not found', StatusCodes.NOT_FOUND);
        }
    }

    //3: update role
    role = await set(model, role, ctx);
    role = await role.save();

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
