// Inventory-consumable Service
import { HydratedDocument } from 'mongoose';
import { InventoryConsumableModel, IInventoryConsumable } from './inventory-consumable.model';
import {
    ICreateInventoryConsumablePayload,
    ISearchInventoryConsumableQuery,
    IUpdateInventoryConsumablePayload,
} from './inventory-consumable.validators';
import { INVENTORY_CONSUMABLE_PERMISSIONS, INVENTORY_CONSUMABLE_STATUS } from './inventory-consumable.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { InventoryMasterService } from '../inventory-master/inventory-master.service';
import { ITEM_TYPES } from '../inventory-master/inventory-master.constants';
import { VendorMasterService } from '../../vendor-master/vendor-master.service';

type InventoryConsumableDocument = HydratedDocument<IInventoryConsumable> | null;

const populate: any[] = [{ path: 'item' }, { path: 'vendor' }];

// A consumable is a physical stock lot of an InventoryMaster catalog item. Like the catalog it
// belongs to no tenant, so there is no ctx.where() scoping. A lot's identity is (item, batch);
// the item ref is immutable and seeded at create.

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// item is seeded at construction in create() and never handled here, so update() can't reassign it.
const set = async (model: any, entity: HydratedDocument<IInventoryConsumable>, ctx: RequestContext) => {
    if (model.batch) {
        entity.batch = model.batch;
    }
    if (model.manufacturingDate) {
        entity.manufacturingDate = model.manufacturingDate;
    }
    if (model.expiryDate) {
        entity.expiryDate = model.expiryDate;
    }
    if (model.quantity !== undefined) {
        entity.quantity = model.quantity;
    }
    // only a manage-level actor may set the lot status (e.g. mark expired)
    if (model.status && ctx.hasAnyPermissions([INVENTORY_CONSUMABLE_PERMISSIONS.MANAGE.code])) {
        entity.status = model.status;
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<InventoryConsumableDocument> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    const query = InventoryConsumableModel.findOne({ _id: id });
    if (options?.populate) {
        query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchInventoryConsumableQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { expiryDate: 1 };

    //1: default visibility — only active lots are visible (no tenant scoping, stock is global)
    const where: any = {};
    where.status = INVENTORY_CONSUMABLE_STATUS.ACTIVE;

    //2: add search filters
    if (filters.item) {
        where.item = filters.item;
    }
    if (filters.vendor) {
        where.vendor = filters.vendor;
    }
    if (filters.batch) {
        where.batch = filters.batch;
    }
    // only a manage-level actor may look past active (see expired lots)
    if (filters.status && ctx.hasAnyPermissions([INVENTORY_CONSUMABLE_PERMISSIONS.MANAGE.code])) {
        where.status = filters.status;
    }

    //3: execute count + data together
    const countPromise = InventoryConsumableModel.countDocuments(where);
    const dataPromise = InventoryConsumableModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateInventoryConsumablePayload, ctx: RequestContext): Promise<HydratedDocument<IInventoryConsumable>> => {
    //1: the referenced catalog item must exist
    const item = await InventoryMasterService.get(model.item, ctx);
    if (!item) {
        return throwAppError('The referenced inventory item does not exist', StatusCodes.NOT_FOUND);
    }

    //1b: the catalog item must actually be a consumable — can't register a lot against a device master
    if (item.type !== ITEM_TYPES.CONSUMABLE) {
        return throwAppError('The referenced inventory item is not a consumable', StatusCodes.BAD_REQUEST);
    }

    //1c: the referenced vendor (supplier) must exist
    const vendor = await VendorMasterService.get(model.vendor, ctx);
    if (!vendor) {
        return throwAppError('The referenced vendor does not exist', StatusCodes.NOT_FOUND);
    }

    //2: guard — a lot is identified by (item, batch); it must not already exist
    // FIXME (followup): search() defaults to status:active, so an EXPIRED lot with the same
    // (item, batch) is invisible here — this guard passes, then save() hits the unique
    // (item, batch) index and throws E11000 → a 500 instead of a clean 409. The dupe is still
    // prevented (index), but the status code is wrong. Fix by having this dedup check across all
    // statuses (e.g. an internal search that ignores the active-only default) so it returns 409.
    const existing = await InventoryConsumableService.search({ item: model.item, batch: model.batch }, ctx);
    if (existing.count > 0) {
        return throwAppError('A consumable lot with this item and batch already exists', StatusCodes.CONFLICT);
    }

    //3: build entity — item + vendor (immutable refs) are seeded here, never in set().
    // status is not accepted at create — a new lot always starts active.
    let entity = new InventoryConsumableModel({ item: model.item, vendor: model.vendor, status: INVENTORY_CONSUMABLE_STATUS.ACTIVE });
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

const update = async (id: string, model: IUpdateInventoryConsumablePayload, ctx: RequestContext) => {
    //1: get first
    let entity = await InventoryConsumableService.get(id, ctx);
    if (!entity) {
        return throwAppError('Consumable lot not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (item is immutable — set() ignores it on an existing doc)
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

// Transaction-safe (single find, no Promise.all). Draw `quantity` units of a catalog item from the
// warehouse, earliest-expiry-first (FEFO), across as many active lots as needed. get() can't express
// this — it fetches one lot by id, whereas FEFO must discover a master's lots sorted by expiry.
// Decrements each lot in place and returns the per-lot draw plan. Throws if stock is short (txn rolls back).
const pullFEFO = async (item: string, quantity: number, ctx: RequestContext): Promise<{ item: string; quantity: number }[]> => {
    const lots = await InventoryConsumableModel.find({
        item,
        status: INVENTORY_CONSUMABLE_STATUS.ACTIVE,
        quantity: { $gt: 0 },
    }).sort({ expiryDate: 1 });

    let remaining = quantity;
    const draws: { item: string; quantity: number }[] = [];
    for (const lot of lots) {
        if (remaining <= 0) {
            break;
        }
        const take = Math.min(lot.quantity, remaining);
        lot.quantity -= take;
        await lot.save();
        draws.push({ item: lot._id.toString(), quantity: take });
        remaining -= take;
    }

    if (remaining > 0) {
        return throwAppError('Insufficient consumable stock to fulfill the request', StatusCodes.BAD_REQUEST);
    }

    return draws;
};

// Transaction-safe. Add `delta` (may be negative) to a specific lot's quantity — used to restore
// stock on a return-approve or a refill-cancel. Reuses get() to fetch the lot; guards against negative.
const adjustQuantity = async (id: string, delta: number, ctx: RequestContext): Promise<HydratedDocument<IInventoryConsumable>> => {
    const lot = await InventoryConsumableService.get(id, ctx);
    if (!lot) {
        return throwAppError('Consumable lot not found', StatusCodes.NOT_FOUND);
    }
    const next = lot.quantity + delta;
    if (next < 0) {
        return throwAppError('Consumable lot quantity cannot go negative', StatusCodes.BAD_REQUEST);
    }
    lot.quantity = next;
    return await lot.save();
};

export const InventoryConsumableService = {
    get,
    search,
    create,
    update,
    pullFEFO,
    adjustQuantity,
};
