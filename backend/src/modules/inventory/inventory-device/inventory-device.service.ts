// Inventory-device Service
import { HydratedDocument } from 'mongoose';
import { InventoryDevice, IInventoryDevice } from './inventory-device.model';
import {
    ICreateInventoryDevicePayload,
    ISearchInventoryDeviceQuery,
    IUpdateInventoryDevicePayload,
} from './inventory-device.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { InventoryMasterService } from '../inventory-master/inventory-master.service';

type InventoryDeviceDocument = HydratedDocument<IInventoryDevice> | null;

const populate: any[] = [{ path: 'item' }];

// A device is an individual physical unit of an InventoryMaster catalog item, identified by its
// unique serialNumber. Like the catalog it belongs to no tenant, so there is no ctx.where()
// scoping. item ref and serialNumber are immutable and seeded at create. status here is an
// operational lifecycle field (available/assigned/maintenance/lost/damaged) — not a soft-delete
// visibility flag — so it is fully readable and not permission-gated (writes are guarded at the route).

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// item + serialNumber are seeded at construction in create() and never handled here.
const set = async (model: any, entity: HydratedDocument<IInventoryDevice>, ctx: RequestContext) => {
    if (model.location) entity.location = model.location;
    if (model.status) entity.status = model.status;
    if (model.manufacturingDate) entity.manufacturingDate = model.manufacturingDate;
    if (model.warrantyExpiryDate) entity.warrantyExpiryDate = model.warrantyExpiryDate;
    if (model.lastCalibrationDate) entity.lastCalibrationDate = model.lastCalibrationDate;
    if (model.nextCalibrationDate) entity.nextCalibrationDate = model.nextCalibrationDate;

    return entity;
};

// get accepts either an ObjectId or the device's serialNumber (natural key).
const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<InventoryDeviceDocument> => {
    const where: any = isValidObjectID(id) ? { _id: id } : { serialNumber: id };

    const query = InventoryDevice.findOne(where);
    if (options?.populate) {
        query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchInventoryDeviceQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { serialNumber: 1 };

    //1: no tenant scoping — device stock is a global registry
    const where: any = {};

    //2: add search filters
    if (filters.item) {
        where.item = filters.item;
    }
    if (filters.location) {
        where.location = filters.location;
    }
    if (filters.serialNumber) {
        where.serialNumber = { $regex: filters.serialNumber, $options: 'i' };
    }
    if (filters.status) {
        where.status = filters.status;
    }

    //3: execute count + data together
    const countPromise = InventoryDevice.countDocuments(where);
    const dataPromise = InventoryDevice.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateInventoryDevicePayload, ctx: RequestContext): Promise<HydratedDocument<IInventoryDevice>> => {
    //1: the referenced catalog item must exist
    const item = await InventoryMasterService.get(model.item, ctx);
    if (!item) {
        return throwAppError('The referenced inventory item does not exist', StatusCodes.NOT_FOUND);
    }

    //2: guard — serialNumber is the unique natural key (reuse get on it)
    const existing = await InventoryDeviceService.get(model.serialNumber, ctx);
    if (existing) {
        return throwAppError('A device with this serial number already exists', StatusCodes.CONFLICT);
    }

    //3: build entity — item + serialNumber (immutable) are seeded here, never in set()
    let entity = new InventoryDevice({ item: model.item, serialNumber: model.serialNumber });
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

const update = async (id: string, model: IUpdateInventoryDevicePayload, ctx: RequestContext) => {
    //1: get first
    let entity = await InventoryDeviceService.get(id, ctx);
    if (!entity) {
        return throwAppError('Device not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (item + serialNumber are immutable — set() ignores them)
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

export const InventoryDeviceService = {
    get,
    search,
    create,
    update,
};
