// Vendor-master Service
import { HydratedDocument } from 'mongoose';
import { VendorMasterModel, IVendorMaster } from './vendor-master.model';
import {
    ICreateVendorMasterPayload,
    ISearchVendorMasterQuery,
    IUpdateVendorMasterPayload,
} from './vendor-master.validators';
import { VENDOR_MASTER_PERMISSIONS, VENDOR_STATUS } from './vendor-master.constants';
import { throwAppError } from '../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../shared/utils/strings';
import { IServiceOptions } from '../../shared/types/service.types';

type VendorMasterDocument = HydratedDocument<IVendorMaster> | null;

// VendorMaster is a global/system registry record — it belongs to no tenant, so there is
// no ctx.where() scoping and no populate chain (it holds no references).

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// code is the immutable natural key — it is seeded at construction in create()
// and never handled here, so update() can never reassign it.
const set = async (model: any, entity: HydratedDocument<IVendorMaster>, ctx: RequestContext) => {
    if (model.name) entity.name = model.name;
    if (model.contacts) entity.contacts = model.contacts;
    if (model.address) entity.address = model.address;
    if (model.status && ctx.hasAnyPermissions([VENDOR_MASTER_PERMISSIONS.MANAGE.code])) entity.status = model.status;

    return entity;
};

// get accepts either an ObjectId or the vendor's code (natural key, stored uppercase).
const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<VendorMasterDocument> => {
    const where: any = isValidObjectID(id) ? { _id: id } : { code: id.toUpperCase() };

    return await VendorMasterModel.findOne(where);
};

const search = async (filters: ISearchVendorMasterQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { name: 1 };

    //1: default visibility — only active vendors are visible (no tenant scoping, registry is global)
    const where: any = {};
    where.status = VENDOR_STATUS.ACTIVE;

    //2: add search filters
    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.code) {
        where.code = { $regex: filters.code, $options: 'i' };
    }
    if (filters.city) {
        where['address.city'] = { $regex: filters.city, $options: 'i' };
    }
    // only a manage-level actor may look past active (see inactive vendors)
    if (filters.status && ctx.hasAnyPermissions([VENDOR_MASTER_PERMISSIONS.MANAGE.code])) {
        where.status = filters.status;
    }

    //3: execute count + data together
    const countPromise = VendorMasterModel.countDocuments(where);
    const dataPromise = VendorMasterModel.find(where).limit(options?.pagination?.limit).skip(options?.pagination?.skip).sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateVendorMasterPayload, ctx: RequestContext): Promise<HydratedDocument<IVendorMaster>> => {
    //1: guard — code must be free (reuse get on the natural key)
    const existing = await VendorMasterService.get(model.code, ctx);
    if (existing) {
        return throwAppError('A vendor with this code already exists', StatusCodes.CONFLICT);
    }

    //2: build entity — code (immutable natural key) is seeded here, never in set()
    let entity = new VendorMasterModel({ code: model.code });
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

const update = async (id: string, model: IUpdateVendorMasterPayload, ctx: RequestContext) => {
    //1: get first
    let entity = await VendorMasterService.get(id, ctx);
    if (!entity) {
        return throwAppError('Vendor not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (code is immutable — set() ignores it on an existing doc)
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

export const VendorMasterService = {
    get,
    search,
    create,
    update,
};
