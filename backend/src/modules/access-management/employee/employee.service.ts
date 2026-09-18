// Employee Service
import mongoose from 'mongoose';
import { EmployeeModel, IEmployee } from './employee.model';
import { EmployeeDocument } from './employee.types';
import { ICreateEmployeePayload, ISearchEmployeeQuery, IUpdateEmployeePayload } from './employee.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID, toObjectId } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { TENANT_TYPE } from '../tenant/tenant.constants';
import { UserService } from '../../user/user.service';
import { ALLOWED_ROLETYPE_CODES } from '../role-type/roleType.constants';

const populate: any[] = [
    { path: 'tenant', select: 'name code type' },
    { path: 'user', select: 'firstName lastName email phone avatar status' },
    { path: 'supervisor', select: 'email type status profile' },
];

// ========================================================================================
// SCOPING HELPERS
// ========================================================================================

// A field officer may only ever see their OWN employee record; anyone else allowed onto these
// routes (admin / ops managers) sees every employee within their tenant scope. Layered on top of
// ctx.where() so the tenant boundary is still enforced.
const ownScope = (ctx: RequestContext): Record<string, any> => {
    if (ctx.role?.type?.code === ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER) {
        return { user: ctx.user?._id };
    }
    return {};
};

// The tenant that owns a new employee: customer actors are pinned to their own tenant; platform
// actors (who onboard field officers) supply it explicitly. Mirrors the contact module.
const resolveTenant = (model: ICreateEmployeePayload, ctx: RequestContext): string => {
    if (ctx.tenant?.type === TENANT_TYPE.CUSTOMER) {
        return (ctx.tenant?._id || ctx.tenant?.id)?.toString();
    }
    if (!model.tenant) {
        return throwAppError('Tenant is required', StatusCodes.BAD_REQUEST);
    }
    return model.tenant;
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

const set = (model: any, entity: EmployeeDocument) => {
    if (model.email) entity.email = model.email;
    if (model.phone) entity.phone = model.phone;
    if (model.type) entity.type = model.type;
    if (model.doj) entity.doj = model.doj;
    if (model.dol !== undefined) entity.dol = model.dol;
    if (model.reason !== undefined) entity.reason = model.reason;
    if (model.status) entity.status = model.status;
    if (model.meta !== undefined) entity.meta = model.meta;

    // compensation
    if (model.salary !== undefined) entity.salary = model.salary;
    if (model.daRule !== undefined) entity.daRule = model.daRule;

    // KYC
    if (model.aadharNumber !== undefined) entity.aadharNumber = model.aadharNumber;
    if (model.panNumber !== undefined) entity.panNumber = model.panNumber;

    // payout account + address (replaced wholesale when supplied)
    if (model.bankDetails !== undefined) entity.bankDetails = model.bankDetails;
    if (model.location !== undefined) entity.location = model.location;

    // profile is merged field-by-field so a partial update keeps untouched fields
    if (model.profile) {
        const current: any = entity.profile ? (entity.profile as any).toObject?.() ?? entity.profile : {};
        entity.profile = { ...current, ...model.profile };
    }

    return entity;
};

// Validates a supervisor id and attaches it — the supervisor must be an existing employee in the
// same tenant, and an employee cannot report to itself.
const attachSupervisor = async (supervisorId: string, entity: EmployeeDocument, ctx: RequestContext) => {
    if (entity._id && supervisorId === entity._id.toString()) {
        throwAppError('An employee cannot be their own supervisor', StatusCodes.BAD_REQUEST);
    }

    const supervisor = await EmployeeService.get(supervisorId, ctx);
    if (!supervisor) {
        throwAppError('Supervisor not found', StatusCodes.NOT_FOUND);
    }
    if (supervisor!.tenant.toString() !== entity.tenant.toString()) {
        throwAppError('Supervisor must belong to the same tenant', StatusCodes.BAD_REQUEST);
    }

    entity.supervisor = toObjectId(supervisorId);
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<EmployeeDocument | null> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    const where: mongoose.QueryFilter<IEmployee> = { ...ctx.where(), ...ownScope(ctx), _id: id };

    let query = EmployeeModel.findOne(where);
    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchEmployeeQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    //1: default scoping — tenant boundary + FO own-scope
    const where: mongoose.QueryFilter<IEmployee> = { ...ctx.where(), ...ownScope(ctx) };

    //2: platform actors may narrow to a specific tenant; ignored for customer actors
    if (filters.tenant && ctx.tenant?.type === TENANT_TYPE.PLATFORM) {
        where.tenant = toObjectId(filters.tenant);
    }

    //3: filters
    if (filters.type) {
        where.type = filters.type;
    }
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.email) {
        where.email = { $regex: filters.email, $options: 'i' };
    }
    if (filters.supervisor) {
        where.supervisor = toObjectId(filters.supervisor);
    }
    if (filters.user) {
        where.user = toObjectId(filters.user);
    }
    if (filters.name) {
        where.$or = [
            { 'profile.firstName': { $regex: filters.name, $options: 'i' } },
            { 'profile.lastName': { $regex: filters.name, $options: 'i' } },
        ];
    }

    const countPromise = EmployeeModel.countDocuments(where);
    const dataPromise = EmployeeModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateEmployeePayload, ctx: RequestContext): Promise<EmployeeDocument> => {
    //1: resolve owning tenant (explicit for platform, own-tenant for customer)
    const tenant = resolveTenant(model, ctx);

    //2: linked user must exist
    const user = await UserService.get(model.user, ctx);
    if (!user) {
        return throwAppError('User not found', StatusCodes.NOT_FOUND);
    }

    //3: uniqueness within the tenant — one record per email and one per user
    const [byEmail, byUser] = await Promise.all([
        EmployeeModel.findOne({ tenant: toObjectId(tenant), email: model.email }),
        EmployeeModel.findOne({ tenant: toObjectId(tenant), user: toObjectId(model.user) }),
    ]);
    if (byEmail) {
        return throwAppError('An employee with this email already exists for this tenant', StatusCodes.CONFLICT);
    }
    if (byUser) {
        return throwAppError('An employee already exists for this user', StatusCodes.CONFLICT);
    }

    //4: build + apply
    const entity = new EmployeeModel({ tenant: toObjectId(tenant), user: toObjectId(model.user) });

    if (model.supervisor) {
        await attachSupervisor(model.supervisor, entity, ctx);
    }

    let employee = set(model, entity);
    employee = await employee.save();

    return employee;
};

const update = async (id: string, model: IUpdateEmployeePayload, ctx: RequestContext) => {
    //1: get (scoped) first
    let employee = await EmployeeService.get(id, ctx);
    if (!employee) {
        return throwAppError('Employee not found', StatusCodes.NOT_FOUND);
    }

    //2: optional supervisor change (tenant, user, email are never touched here)
    if (model.supervisor) {
        await attachSupervisor(model.supervisor, employee, ctx);
    }

    employee = set(model, employee);
    employee = await employee.save();

    return employee;
};

export const EmployeeService = {
    get,
    search,
    create,
    update,
};

// ========================================================================================
// EXPORTS
// ========================================================================================
