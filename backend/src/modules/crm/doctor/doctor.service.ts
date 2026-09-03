// Doctor Service
import { HydratedDocument } from 'mongoose';
import { DoctorModel, IDoctor } from './doctor.model';
import {
    CreateDoctorPayloadSchema,
    IBulkDoctorPayload,
    ICreateDoctorPayload,
    ISearchDoctorQuery,
    IUpdateDoctorPayload,
} from './doctor.validators';
import { DOCTOR_PERMISSIONS, DOCTOR_STATUS } from './doctor.constants';
import { formatZodError, throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { TENANT_TYPE } from '../../access-management/tenant/tenant.constants';
import { TenantService } from '../../access-management/tenant/tenant.service';
import { CsvHelper } from '../../../shared/helpers/csvHelper';
import { processInBatches } from '../../../shared/utils/batchProcessor';

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

    //5: save — the findOne guards above catch the common case, but concurrent creates (e.g. bulk
    // upload batches) can slip past them; the {tenant, pharmaCode}/{tenant, email} unique indexes
    // are the real backstop. Translate their raw E11000 into the same clean 409.
    try {
        doctor = await doctor.save();
    } catch (err: any) {
        if (err?.code === 11000) {
            const field = err?.keyPattern?.email ? 'email' : 'pharma code';
            return throwAppError(`A doctor with this ${field} already exists for this company`, StatusCodes.CONFLICT);
        }
        throw err;
    }

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

// Bulk-create doctors from a CSV upload. Each row is mapped to a create payload (tenant comes
// from the form body, per-row doctor fields from the CSV), validated against the same schema as
// the single create, then run through DoctorService.create in small batches. Schema-invalid rows
// and per-row create failures (e.g. duplicate pharmaCode/email) are collected, not fatal — the
// valid rows still get created.
const bulkCreate = async (payload: IBulkDoctorPayload, file: Express.Multer.File, ctx: RequestContext) => {
    const rows = await CsvHelper.parse(file.buffer);

    const validRows: ICreateDoctorPayload[] = [];
    const invalidRows: { row: number; error: any }[] = [];
    // in-file dedup: pharmaCode is unique per tenant, so two rows with the same pharmaCode would
    // race inside a batch. Reject the later one up front (first occurrence wins) — maps pharmaCode
    // to the row number it was first seen at, for a clear error message.
    const seenPharmaCodes = new Map<string, number>();

    rows.forEach((row: any, index: number) => {
        const rowNumber = index + 1;
        const doctorPayload = {
            // tenant is taken from the form body, not the CSV — one upload targets one tenant
            tenant: payload.tenant,
            pharmaCode: row.pharmaCode,
            name: row.name,
            specialization: row.specialization,
            mobile: row.mobile,
            city: row.city,
            state: row.state,
            pincode: row.pincode,
            email: row.email,
            googleMapLink: row.googleMapLink || undefined,
            status: row.status || undefined,
        };

        const { data, success, error } = CreateDoctorPayloadSchema.safeParse(doctorPayload);
        if (!success) {
            invalidRows.push({ row: rowNumber, error: formatZodError(error) });
            return;
        }

        // reject a pharmaCode that already appeared earlier in this same file
        const firstSeenAt = seenPharmaCodes.get(data.pharmaCode);
        if (firstSeenAt !== undefined) {
            invalidRows.push({
                row: rowNumber,
                error: `Duplicate pharmaCode "${data.pharmaCode}" in file (first seen at row ${firstSeenAt})`,
            });
            return;
        }

        seenPharmaCodes.set(data.pharmaCode, rowNumber);
        validRows.push(data);
    });

    const batchResult = await processInBatches(
        validRows,
        async (item: ICreateDoctorPayload) => {
            return await DoctorService.create(item, ctx);
        },
        5,
    );

    return {
        totalRows: rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        created: batchResult.success.length,
        failed: batchResult.failed.length,
        // both schema-invalid rows and create failures, normalized to { row, error }
        errors: [
            ...invalidRows,
            ...batchResult.failed.map((f) => ({ row: f.index + 1, error: (f.error as any)?.message || 'Failed to create doctor' })),
        ],
    };
};

export const DoctorService = {
    get,
    search,
    create,
    update,
    bulkCreate,
};
