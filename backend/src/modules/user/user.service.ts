import mongoose, { HydratedDocument } from 'mongoose';
import { IUser, UserModel } from './user.model';
import { ISearchUserQuery, IUpdateUserPayload } from './user.validators';
import bcrypt from 'bcrypt';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { USER_PERMISSIONS, USER_STATUS } from './user.constants';
import { escapeRegex, isValidEmail } from '../../shared/utils/strings';
import { IRegisterUserPayload } from '../auth/auth.validators';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { IServiceOptions } from '../../shared/types/service.types';
import { RoleModel } from '../access-management/role/role.model';
import { TENANT_TYPE } from '../access-management/tenant/tenant.constants';

type UserDocument = HydratedDocument<IUser> | null;
const populate: any[] = [];

// User has no `tenant` field of its own — a user's tenant membership is
// indirect, via the Role bound to them (Role.user -> User, Role.tenant ->
// Tenant). ctx.where() (contextBuilder.ts) can't be reused as-is here the
// way every other module does, since it builds a direct `{ tenant: ... }`
// field filter — that would silently match nothing on the User collection.
// For a CUSTOMER-tenant caller, resolve the set of user IDs that actually
// have a Role in ctx.tenant and constrain the query to that set; a
// PLATFORM-tenant caller (e.g. system:manage) sees every user, matching
// ctx.where()'s own "no filter for platform" behavior.
const scopeToTenant = async (ctx: RequestContext): Promise<mongoose.QueryFilter<IUser>> => {
    if (ctx.tenant?.type !== TENANT_TYPE.CUSTOMER) {
        return {};
    }
    const tenantId = ctx.tenant._id || ctx.tenant.id;
    const roles = await RoleModel.find({ tenant: tenantId }).select('user').lean();
    return { _id: { $in: roles.map((role: any) => role.user) } };
};
// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = async (model: any, entity: HydratedDocument<IUser>, ctx: RequestContext) => {
    if (model.firstName) {
        entity.firstName = model.firstName;
    }
    if (model.lastName) {
        entity.lastName = model.lastName;
    }
    if (model.gender) {
        entity.gender = model.gender;
    }
    if (model.phone) {
        entity.phone = model.phone;
    }
    if (model.status && ctx.hasAllPermissions([USER_PERMISSIONS.MANAGE.code])) {
        entity.status = model.status;
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<UserDocument> => {
    // Combined via $and, not a plain object spread — scope's own `_id: {$in:
    // [...]}` key would otherwise collide with (and be silently overwritten
    // by) the `_id: id` key added below them, discarding the tenant scoping
    // entirely while still returning success.
    const scope = options?.scopeToTenant ? await scopeToTenant(ctx) : {};

    let query = null;

    if (mongoose.isValidObjectId(id)) {
        query = UserModel.findOne({ $and: [scope, { _id: id }] });
    } else if (isValidEmail(id)) {
        query = UserModel.findOne({ $and: [scope, { email: id }] });
    } else {
        return throwAppError('Invalid user identifier', StatusCodes.BAD_REQUEST);
    }

    if (query) {
        if (options?.populate) {
            query = query.populate(populate);
        }
    }

    return await query;
};

const search = async (filters: ISearchUserQuery, ctx: RequestContext, options?: IServiceOptions) => {
    let sort: any = {
        createdAt: -1,
    };

    const scope = options?.scopeToTenant ? await scopeToTenant(ctx) : {};

    let where: mongoose.QueryFilter<IUser> = {
        ...scope,
        status: USER_STATUS.ACTIVE,
    };

    if (filters.name) {
        const namePattern = escapeRegex(filters.name);
        where.$or = [{ firstName: { $regex: namePattern, $options: 'i' } }, { lastName: { $regex: namePattern, $options: 'i' } }];
    }

    if (filters.email) {
        where.email = { $regex: escapeRegex(filters.email), $options: 'i' };
    }

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.gender) {
        where.gender = filters.gender;
    }

    if (filters.joinedFrom || filters.joinedTo) {
        where.createdAt = {};
        if (filters.joinedFrom) where.createdAt.$gte = filters.joinedFrom;
        if (filters.joinedTo) where.createdAt.$lte = filters.joinedTo;
    }

    const countPromise = UserModel.countDocuments(where);

    const dataPromise = UserModel.find(where)
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

const create = async (model: IRegisterUserPayload, ctx: RequestContext): Promise<HydratedDocument<IUser>> => {
    let user: UserDocument = null;

    //1 check exitsing user
    user = await UserService.get(model.email, ctx);
    if (user) {
        return throwAppError('User already exists', StatusCodes.CONFLICT);
    }

    //1: hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(model.password, salt);

    //2: create user
    const entity = new UserModel({
        email: model.email,
        status: USER_STATUS.INACTIVE,
        password: hashedPassword,
    });

    //set remaining fields
    user = await set(model, entity, ctx);

    user = await user.save();
    return user;
};

const update = async (id: string, model: IUpdateUserPayload, ctx: RequestContext) => {
    //1: get user first
    let user: UserDocument = null;
    user = await UserService.get(id, ctx, { scopeToTenant: true });
    if (!user) {
        return throwAppError('User not found', StatusCodes.NOT_FOUND);
    }

    //2: update user
    user = await set(model, user, ctx);
    user = await user.save();

    //3: return user
    return user;
};



// dedicated method for auth flows only
const getUserWithPassword = async (email: string) => {
    return await UserModel.findOne({ email }).select('+password');
};
export const UserService = {
    get,
    search,
    create,
    update,
    getUserWithPassword,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
