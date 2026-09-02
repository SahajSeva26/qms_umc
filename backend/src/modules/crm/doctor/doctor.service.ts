// Doctor Service
import { HydratedDocument } from 'mongoose';
import { DoctorModel, IDoctor } from './doctor.model';
import { ICreateDoctorPayload, ISearchDoctorQuery, IUpdateDoctorPayload } from './doctor.validators';
import { DOCTOR_PERMISSIONS, DOCTOR_STATUS } from './doctor.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { TENANT_TYPE } from '../../access-management/tenant/tenant.constants';
import { TenantService } from '../../access-management/tenant/tenant.service';

type DoctorDocument = HydratedDocument<IDoctor> | null;

// Doctor is tenant-scoped — every read starts from ctx.where() so a customer can only ever
// see its own tenant's doctors, and a forged id from another tenant 404s instead of leaking.
const populate: any[] = [{ path: 'tenant', select: 'name code' }];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// Doctors are created by internal (platform) roles, so the tenant comes from the payload.
// A customer user can only ever create within their own tenant, so we ignore whatever they
// send and pin it to their context tenant.
const resolveTenant = async (model: ICreateDoctorPayload, ctx: RequestContext): Promise<string> => {
    //1: a customer user can only ever create within their own tenant — pin it from context,
    // ignore whatever tenant they sent (no existence check needed, it's their authed tenant)
    if (ctx.tenant?.type === TENANT_TYPE.CUSTOMER) {
        return (ctx.tenant?._id || ctx.tenant?.id)?.toString();
    }

    //2: platform (QMS) staff must supply the target tenant, and it must actually exist
    if (!model.tenant) {
        return throwAppError('Tenant is required', StatusCodes.BAD_REQUEST);
    }
    const tenant = await TenantService.get(model.tenant, ctx);
    if (!tenant) {
        return throwAppError('Tenant not found', StatusCodes.NOT_FOUND);
    }
    return (tenant._id || tenant.id)?.toString();
};

// pharmaCode is the immutable natural key — it is seeded at construction in create()
// and never handled here, so update() can never reassign it.
const set = async (model: any, entity: HydratedDocument<IDoctor>, ctx: RequestContext) => {
    if (model.name) entity.name = model.name;
    if (model.specialization) entity.specialization = model.specialization;
    if (model.mobile) entity.mobile = model.mobile;
    if (model.city) entity.city = model.city;
    if (model.state) entity.state = model.state;
    if (model.pincode) entity.pincode = model.pincode;
    if (model.email) entity.email = model.email;
    if (model.googleMapLink !== undefined) entity.googleMapLink = model.googleMapLink;
    if (model.status) entity.status = model.status;

    return entity;
};

// get accepts either an ObjectId or the doctor's pharmaCode (natural key).
const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<DoctorDocument> => {
    const where: any = { ...ctx.where(), ...(isValidObjectID(id) ? { _id: id } : { pharmaCode: id }) };

    let query = DoctorModel.findOne(where);
    if (options?.populate) {
        query = query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchDoctorQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { name: 1 };

    //1: default scoping — platform sees all tenants, customer pinned to own tenant (ctx.where)
    const where: any = { ...ctx.where() };

    //2: default visibility — only active doctors are visible
    where.status = DOCTOR_STATUS.ACTIVE;

    //3: platform staff may narrow to a specific tenant's doctors; the filter is ignored for
    // customer users so they can never read another tenant's doctors.
    if (filters.tenant && ctx.tenant?.type === TENANT_TYPE.PLATFORM) {
        where.tenant = filters.tenant;
    }

    //4: add search filters
    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.specialization) {
        where.specialization = filters.specialization;
    }
    // only a manage-level actor may look past active (see inactive doctors)
    if (filters.status && ctx.hasAnyPermissions([DOCTOR_PERMISSIONS.MANAGE.code])) {
        where.status = filters.status;
    }
    if (filters.city) {
        where.city = { $regex: filters.city, $options: 'i' };
    }
    if (filters.state) {
        where.state = { $regex: filters.state, $options: 'i' };
    }
    if (filters.pharmaCode) {
        where.pharmaCode = filters.pharmaCode;
    }

    //3: execute count + data together
    const countPromise = DoctorModel.countDocuments(where);
    const dataPromise = DoctorModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateDoctorPayload, ctx: RequestContext): Promise<HydratedDocument<IDoctor>> => {
    //1: resolve the owning tenant (explicit + existence-checked for platform, own-tenant for customer)
    const tenant = await resolveTenant(model, ctx);

    //2: guard — pharmaCode must be free within this tenant (scoped to the resolved tenant,
    // not ctx, so a platform actor can't collide a doctor against a different tenant's scope)
    const existingCode = await DoctorModel.findOne({ tenant, pharmaCode: model.pharmaCode });
    if (existingCode) {
        return throwAppError('A doctor with this pharma code already exists for this company', StatusCodes.CONFLICT);
    }

    //3: guard — email must be free within this tenant (returns a clean 409 instead of a raw
    // duplicate-key error from the {tenant, email} unique index)
    const existingEmail = await DoctorModel.findOne({ tenant, email: model.email });
    if (existingEmail) {
        return throwAppError('A doctor with this email already exists for this company', StatusCodes.CONFLICT);
    }

    //4: build entity — tenant + pharmaCode (immutable natural key) are seeded here, never in set()
    const entity = new DoctorModel({ tenant, pharmaCode: model.pharmaCode });
    let doctor = await set(model, entity, ctx);
    doctor = await doctor.save();

    return doctor;
};

const update = async (id: string, model: IUpdateDoctorPayload, ctx: RequestContext) => {
    //1: get first
    let doctor = await DoctorService.get(id, ctx);
    if (!doctor) {
        return throwAppError('Doctor not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (pharmaCode is immutable — set() ignores it on an existing doc)
    doctor = await set(model, doctor, ctx);
    doctor = await doctor.save();

    return doctor;
};

export const DoctorService = {
    get,
    search,
    create,
    update,
};
