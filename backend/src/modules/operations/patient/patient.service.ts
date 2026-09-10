// Patient Service
import { HydratedDocument } from 'mongoose';
import { PatientModel, PatientType } from './patient.model';
import { ICreatePatientPayload, ISearchPatientQuery, IUpdatePatientPayload } from './patient.validators';
import { PATIENT_COUNTER_ENTITY, PATIENT_PERMISSIONS, PATIENT_STATUS } from './patient.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { CounterService } from '../../counter/counter.service';
import { withTransaction } from '../../../shared/helpers/transactionHelper';

type PatientDocument = HydratedDocument<PatientType> | null;

// Patient is a global/system registry — it belongs to no tenant, so there is no ctx.where()
// scoping. createdBy references the Role that registered the patient.
const populate: any[] = [{ path: 'createdBy', select: 'name code' }];

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// code is the immutable natural key — seeded from the counter in create(), never handled here,
// so update() can never reassign it. createdBy is likewise set only at construction.
const set = async (model: any, entity: HydratedDocument<PatientType>, ctx: RequestContext) => {
    if (model.firstName) {
        entity.firstName = model.firstName;
    }
    if (model.middleName !== undefined) {
        entity.middleName = model.middleName;
    }
    if (model.lastName !== undefined) {
        entity.lastName = model.lastName;
    }
    if (model.dateOfBirth) {
        entity.dateOfBirth = model.dateOfBirth;
    }
    if (model.gender) {
        entity.gender = model.gender;
    }
    if (model.mobile) {
        entity.mobile = model.mobile;
    }
    if (model.email !== undefined) {
        entity.email = model.email;
    }
    if (model.address !== undefined) {
        entity.address = model.address;
    }
    // status is a soft-delete flag — only a manage-level actor may change it
    if (model.status && ctx.hasAnyPermissions([PATIENT_PERMISSIONS.MANAGE.code])) {
        entity.status = model.status;
    }

    return entity;
};

// get accepts either an ObjectId or the patient's code (natural key).
const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<PatientDocument> => {
    const where: any = isValidObjectID(id) ? { _id: id } : { code: id };

    const query = PatientModel.findOne(where);
    if (options?.populate) {
        query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchPatientQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    //1: default visibility — only active patients are visible (no tenant scoping, registry is global)
    const where: any = {};
    where.status = PATIENT_STATUS.ACTIVE;

    //2: add search filters
    if (filters.name) {
        where.$or = [
            { firstName: { $regex: filters.name, $options: 'i' } },
            { middleName: { $regex: filters.name, $options: 'i' } },
            { lastName: { $regex: filters.name, $options: 'i' } },
        ];
    }
    if (filters.code) {
        where.code = { $regex: filters.code, $options: 'i' };
    }
    if (filters.mobile) {
        where.mobile = { $regex: filters.mobile, $options: 'i' };
    }
    if (filters.email) {
        where.email = { $regex: filters.email, $options: 'i' };
    }
    if (filters.gender) {
        where.gender = filters.gender;
    }
    // only a manage-level actor may look past active (see inactive/soft-deleted patients)
    if (filters.status && ctx.hasAnyPermissions([PATIENT_PERMISSIONS.MANAGE.code])) {
        where.status = filters.status;
    }

    //3: execute count + data together
    const countPromise = PatientModel.countDocuments(where);
    const dataPromise = PatientModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreatePatientPayload, ctx: RequestContext): Promise<HydratedDocument<PatientType>> => {
    //1: guard — email (when supplied) must be free. It is a global, sparse-unique identity key.
    if (model.email) {
        const existing = await PatientModel.findOne({ email: model.email });
        if (existing) {
            return throwAppError('A patient with this email already exists', StatusCodes.CONFLICT);
        }
    }

    //2: code is the immutable natural key — auto-generated from the global `patient` counter
    // (pat-000001). The counter increment auto-joins this transaction, so if the save fails the
    // code is rolled back and never burned.
    const entity = await withTransaction(async () => {
        const code: string = await CounterService.next(PATIENT_COUNTER_ENTITY, ctx);

        let entity = new PatientModel({ code, createdBy: ctx.role?._id });
        entity = await set(model, entity, ctx);
        entity = await entity.save();

        return entity;
    });

    return entity;
};

const update = async (id: string, model: IUpdatePatientPayload, ctx: RequestContext) => {
    //1: get first
    let entity = await PatientService.get(id, ctx);
    if (!entity) {
        return throwAppError('Patient not found', StatusCodes.NOT_FOUND);
    }

    //2: guard — if email is being changed, the new one must be free (excluding this patient)
    if (model.email && model.email !== entity.email) {
        const existing = await PatientModel.findOne({ email: model.email, _id: { $ne: entity._id } });
        if (existing) {
            return throwAppError('A patient with this email already exists', StatusCodes.CONFLICT);
        }
    }

    //3: apply editable fields (code + createdBy are immutable — set() ignores them)
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

export const PatientService = {
    get,
    search,
    create,
    update,
};
