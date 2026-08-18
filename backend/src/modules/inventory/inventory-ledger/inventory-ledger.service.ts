// Inventory-ledger Service
import { HydratedDocument } from 'mongoose';
import { InventoryLedgerModel, IInventoryLedger } from './inventory-ledger.model';
import { IRecordInventoryLedgerPayload, ISearchInventoryLedgerQuery } from './inventory-ledger.validators';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';

type InventoryLedgerDocument = HydratedDocument<IInventoryLedger> | null;

const populate: any[] = [{ path: 'request' }, { path: 'inventory' }, { path: 'assignee' }];

// The ledger is append-only and system-written: only record() writes, and only reads are exposed via
// the API. There is deliberately no update/delete/create-route.

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// Append one movement row. Called by the inventory-request service INSIDE its transaction (single
// save, so it is txn-safe and commits/rolls back with the stock change). actor is snapshotted from
// ctx so the row stays true even if the user/role later changes.
const record = async (payload: IRecordInventoryLedgerPayload, ctx: RequestContext): Promise<HydratedDocument<IInventoryLedger>> => {
    const actorName = `${ctx.user?.firstName || ''} ${ctx.user?.lastName || ''}`.trim();
    const entity = new InventoryLedgerModel({
        request: payload.request,
        requestType: payload.requestType,
        inventoryType: payload.inventoryType,
        inventory: payload.inventory,
        quantity: payload.quantity,
        from: payload.from,
        to: payload.to,
        assignee: payload.assignee,
        actor: {
            roleId: ctx.role?._id || ctx.role?.id,
            name: actorName || undefined,
            email: ctx.user?.email,
        },
    });
    return await entity.save();
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<InventoryLedgerDocument> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    const query = InventoryLedgerModel.findOne({ _id: id });
    if (options?.populate) {
        query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchInventoryLedgerQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    //1: no tenant scoping — the ledger is global (like the rest of the inventory domain)
    const where: any = {};

    //2: add search filters
    if (filters.request) {
        where.request = filters.request;
    }
    if (filters.requestType) {
        where.requestType = filters.requestType;
    }
    if (filters.inventoryType) {
        where.inventoryType = filters.inventoryType;
    }
    if (filters.inventory) {
        where.inventory = filters.inventory;
    }
    if (filters.assignee) {
        where.assignee = filters.assignee;
    }
    if (filters.from) {
        where.from = filters.from;
    }
    if (filters.to) {
        where.to = filters.to;
    }

    //3: execute count + data together
    const countPromise = InventoryLedgerModel.countDocuments(where);
    const dataPromise = InventoryLedgerModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

export const InventoryLedgerService = {
    record,
    get,
    search,
};
