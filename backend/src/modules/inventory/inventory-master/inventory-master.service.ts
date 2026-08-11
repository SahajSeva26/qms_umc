// Inventory-master Service
import { HydratedDocument } from 'mongoose';
import { InventoryMaster, IInventoryMaster } from './inventory-master.model';
import { ICreateInventoryMasterPayload, ISearchInventoryMasterQuery, IUpdateInventoryMasterPayload } from './inventory-master.validators';
import { INVENTORY_MASTER_PERMISSIONS, ITEM_STATUS } from './inventory-master.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';

type InventoryMasterDocument = HydratedDocument<IInventoryMaster> | null;

// InventoryMaster is a global/system catalog record — it belongs to no tenant, so there is
// no ctx.where() scoping and no populate chain (it holds no references).

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// code is the immutable natural key — it is seeded at construction in create()
// and never handled here, so update() can never reassign it.
const set = async (model: any, entity: HydratedDocument<IInventoryMaster>, ctx: RequestContext) => {
    if (model.name) entity.name = model.name;
    if (model.description) entity.description = model.description;
    if (model.type) entity.type = model.type;
    if (model.sku) entity.sku = model.sku;
    if (model.unit) entity.unit = model.unit;
    if (model.status && ctx.hasAnyPermissions([INVENTORY_MASTER_PERMISSIONS.MANAGE.code])) entity.status = model.status;
    if (model.minStock !== undefined) entity.minStock = model.minStock;
    if (model.maxStock !== undefined) entity.maxStock = model.maxStock;

    return entity;
};

// get accepts either an ObjectId or the item's code (natural key).
const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<InventoryMasterDocument> => {
    const where: any = isValidObjectID(id) ? { _id: id } : { code: id };

    return await InventoryMaster.findOne(where);
};

const search = async (filters: ISearchInventoryMasterQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { name: 1 };

    //1: default visibility — only active items are visible (no tenant scoping, catalog is global)
    const where: any = {};
    where.status = ITEM_STATUS.ACTIVE;

    //2: add search filters
    if (filters.name) {
        where.name = { $regex: filters.name, $options: 'i' };
    }
    if (filters.code) {
        where.code = { $regex: filters.code, $options: 'i' };
    }
    if (filters.sku) {
        where.sku = { $regex: filters.sku, $options: 'i' };
    }
    if (filters.type) {
        where.type = filters.type;
    }
    // only a manage-level actor may look past active (see inactive items)
    if (filters.status && ctx.hasAnyPermissions([INVENTORY_MASTER_PERMISSIONS.MANAGE.code])) {
        where.status = filters.status;
    }

    //3: execute count + data together
    const countPromise = InventoryMaster.countDocuments(where);
    const dataPromise = InventoryMaster.find(where).limit(options?.pagination?.limit).skip(options?.pagination?.skip).sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateInventoryMasterPayload, ctx: RequestContext): Promise<HydratedDocument<IInventoryMaster>> => {
    //1: guard — code must be free (reuse get on the natural key)
    const existing = await InventoryMasterService.get(model.code, ctx);
    if (existing) {
        return throwAppError('An inventory item with this code already exists', StatusCodes.CONFLICT);
    }

    //2: build entity — code (immutable natural key) is seeded here, never in set()
    let entity = new InventoryMaster({ code: model.code });
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

const update = async (id: string, model: IUpdateInventoryMasterPayload, ctx: RequestContext) => {
    //1: get first
    let entity = await InventoryMasterService.get(id, ctx);
    if (!entity) {
        return throwAppError('Inventory item not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (code is immutable — set() ignores it on an existing doc)
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

export const InventoryMasterService = {
    get,
    search,
    create,
    update,
};
