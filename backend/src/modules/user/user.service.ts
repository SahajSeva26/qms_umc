import mongoose, { HydratedDocument } from 'mongoose';
import { IUser, UserModel } from './user.model';
import { ISearchUserQuery, IUpdateUserPayload, IUserReportQuery } from './user.validators';
import bcrypt from 'bcrypt';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import {
    USER_PERMISSIONS,
    USER_REPORT_DEFAULT_TREND_DAYS,
    USER_REPORT_DEFAULT_TREND_MONTHS,
    USER_REPORT_GRANULARITY,
    USER_STATUS,
} from './user.constants';
import { isValidEmail } from '../../shared/utils/strings';
import { IRegisterUserPayload } from '../auth/auth.validators';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { IServiceOptions } from '../../shared/types/service.types';
import { endOfUTCDay, startOfUTCDay } from '../../shared/utils/dates';

type UserDocument = HydratedDocument<IUser> | null;
const populate: any[] = [];
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
    let query = null;

    if (mongoose.isValidObjectId(id)) {
        query = UserModel.findOne({ _id: id });
    } else if (isValidEmail(id)) {
        query = UserModel.findOne({ email: id });
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

    let where: mongoose.QueryFilter<IUser> = {
        // add context default where build here
        status: USER_STATUS.ACTIVE,
    };

    if (filters.name) {
        where.$or = [{ firstName: { $regex: filters.name, $options: 'i' } }, { lastName: { $regex: filters.name, $options: 'i' } }];
    }

    if (filters.email) {
        where.email = { $regex: filters.email, $options: 'i' };
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
        status: USER_STATUS.ACTIVE,
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
    user = await UserService.get(id, ctx);
    if (!user) {
        return throwAppError('User not found', StatusCodes.NOT_FOUND);
    }

    //2: update user
    user = await set(model, user, ctx);
    user = await user.save();

    //3: return user
    return user;
};



// dedicated method for auth flows only — accepts a user id or email
const getUserWithPassword = async (identifier: string) => {
    const where = mongoose.isValidObjectId(identifier) ? { _id: identifier } : { email: identifier };
    return await UserModel.findOne(where).select('+password');
};

// UTC calendar-month equivalents of dates.ts's startOfUTCDay/endOfUTCDay — kept local since this
// report is (so far) the only caller of month-bucketed ranges.
const startOfUTCMonth = (date: Date): Date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
const endOfUTCMonth = (date: Date): Date =>
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));

// aggregate stats for the admin/dashboard User Report. Status/gender/lockout counts are current-state
// snapshots (unfiltered); only the registration trend is windowed by from/to+granularity. All four are
// independent branches over the same collection, so one $facet aggregation replaces four separate queries.
//
// NOT tenant-scoped, deliberately: User has no `tenant` field (only indirectly via Role.user/Role.tenant,
// same as UserService.get/search above), so it's a global registry like `doctor`/`inventory-*`, not a
// tenant-owned collection. This endpoint is also only reachable with USER_PERMISSIONS.MANAGE, which the
// tenant-permission-group ceiling (see role.service.ts/roleType.service.ts) makes structurally impossible
// to grant inside any customer tenant — createTenant() only ever seeds GET/SEARCH/UPDATE into a new
// tenant's permission group (see tenant.service.ts createTenant). So only platform/system-tenant actors,
// who already get an unscoped ctx.where() everywhere else, can ever reach this report. Do not add a
// ctx.where()/$lookup-based tenant filter here — there is no tenant field to filter by without joining
// `roles`, which would reach across module boundaries for a filter no reachable caller needs.
const report = async (filters: IUserReportQuery, ctx: RequestContext) => {
    //1: resolve granularity + the raw (unaligned) window — defaults: last 30 days, or last 12
    // calendar months when granularity=month is requested without an explicit range. Calendar-month
    // arithmetic (setUTCMonth) is used instead of "months * 30 days" so the window is exact regardless
    // of how many days those 12 months actually contain.
    const granularity = filters.granularity || USER_REPORT_GRANULARITY.DAY;
    const rawTo = filters.to ? new Date(filters.to) : new Date();

    let rawFrom: Date;
    if (filters.from) {
        rawFrom = new Date(filters.from);
    } else if (granularity === USER_REPORT_GRANULARITY.MONTH) {
        rawFrom = new Date(rawTo);
        rawFrom.setUTCMonth(rawFrom.getUTCMonth() - USER_REPORT_DEFAULT_TREND_MONTHS);
    } else {
        rawFrom = new Date(rawTo.getTime() - USER_REPORT_DEFAULT_TREND_DAYS * 24 * 60 * 60 * 1000);
    }

    //2: align the window to whole UTC bucket boundaries (day or month) so the $match range exactly
    // covers every bucket $dateToString will produce below — otherwise a partial first/last bucket
    // would under-count relative to a full one.
    const from = granularity === USER_REPORT_GRANULARITY.MONTH ? startOfUTCMonth(rawFrom) : startOfUTCDay(rawFrom);
    const to = granularity === USER_REPORT_GRANULARITY.MONTH ? endOfUTCMonth(rawTo) : endOfUTCDay(rawTo);

    const trendDateFormat = granularity === USER_REPORT_GRANULARITY.MONTH ? '%Y-%m' : '%Y-%m-%d';

    //3: single aggregation, single collection scan. Bucketing is explicitly UTC (timezone: 'UTC') to
    // match this project's only date convention (see shared/utils/dates.ts) — there is no per-user or
    // business timezone anywhere in this codebase to bucket against instead.
    const [result] = await UserModel.aggregate([
        {
            $facet: {
                totalUsers: [{ $count: 'count' }],
                statusCounts: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
                genderCounts: [{ $group: { _id: { $ifNull: ['$gender', 'unspecified'] }, count: { $sum: 1 } } }],
                lockedAccounts: [{ $match: { lockUntil: { $gt: new Date() } } }, { $count: 'count' }],
                registrationTrend: [
                    { $match: { createdAt: { $gte: from, $lte: to } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: trendDateFormat, date: '$createdAt', timezone: 'UTC' } },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ],
            },
        },
    ]);

    return { ...result, meta: { granularity, from, to } };
};

export const UserService = {
    get,
    search,
    create,
    update,
    getUserWithPassword,
    report,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
