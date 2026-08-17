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

type InventoryConsumableDocument = HydratedDocument<IInventoryConsumable> | null;

const populate: any[] = [{ path: 'item' }];

// A consumable is a physical stock lot of an InventoryMaster catalog item. Like the catalog it
// belongs to no tenant, so there is no ctx.where() scoping. A lot's identity is (item, batch);
// the item ref is immutable and seeded at create.

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// item is seeded at construction in create() and never handled here, so update() can't reassign it.
const set = async (model: any, entity: HydratedDocument<IInventoryConsumable>, ctx: RequestContext) => {
    if (model.batch) entity.batch = model.batch;
    if (model.manufacturingDate) entity.manufacturingDate = model.manufacturingDate;
    if (model.expiryDate) entity.expiryDate = model.expiryDate;
    if (model.quantity !== undefined) entity.quantity = model.quantity;
    // only a manage-level actor may set the lot status (e.g. mark expired)
    if (model.status && ctx.hasAnyPermissions([INVENTORY_CONSUMABLE_PERMISSIONS.MANAGE.code])) entity.status = model.status;

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

    //3: build entity — item (immutable ref) is seeded here, never in set()
    let entity = new InventoryConsumableModel({ item: model.item });
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

export const InventoryConsumableService = {
    get,
    search,
    create,
    update,
};
