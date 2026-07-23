// Doctor Service
import { HydratedDocument } from 'mongoose';
import { DoctorModel, IDoctor } from './doctor.model';
import { ICreateDoctorPayload, ISearchDoctorQuery, IUpdateDoctorPayload } from './doctor.validators';
import { DOCTOR_PERMISSIONS, DOCTOR_STATUS } from './doctor.constants';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../shared/utils/strings';
import { IServiceOptions } from '../../shared/types/service.types';

type DoctorDocument = HydratedDocument<IDoctor> | null;

// Doctor is a global/system record — it belongs to no tenant, so there is no
// ctx.where() scoping and no populate chain (it holds no references).

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

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
    const where: any = isValidObjectID(id) ? { _id: id } : { pharmaCode: id };

    return await DoctorModel.findOne(where);
};

const search = async (filters: ISearchDoctorQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { name: 1 };

    //1: default visibility — only active doctors are visible (no tenant scoping, doctor is global)
    const where: any = {};
    where.status = DOCTOR_STATUS.ACTIVE;

    //2: add search filters
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
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateDoctorPayload, ctx: RequestContext): Promise<HydratedDocument<IDoctor>> => {
    //1: guard — pharmaCode must be free (reuse get on the natural key)
    const existing = await DoctorService.get(model.pharmaCode, ctx);
    if (existing) {
        return throwAppError('A doctor with this pharma code already exists', StatusCodes.CONFLICT);
    }

    //2: build entity — pharmaCode (immutable natural key) is seeded here, never in set()
    const entity = new DoctorModel({ pharmaCode: model.pharmaCode });
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
