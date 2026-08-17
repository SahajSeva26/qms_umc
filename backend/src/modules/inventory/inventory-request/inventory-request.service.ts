// Inventory-request Service
import { HydratedDocument } from 'mongoose';
import { InventoryRequestModel, IInventoryRequest } from './inventory-request.model';
import {
    ICreateInventoryRequestPayload,
    IMoveStagePayload,
    ISearchInventoryRequestQuery,
    IUpdateInventoryRequestPayload,
} from './inventory-request.validators';
import {
    ALLOWED_ITEM_TYPES_BY_REQUEST_TYPE,
    INVENTORY_REQUEST_ITEM_TYPE,
    INVENTORY_REQUEST_PERMISSIONS,
    INVENTORY_REQUEST_STATUS,
    INVENTORY_REQUEST_TRANSITION_MAP,
    INVENTORY_REQUEST_TYPE,
} from './inventory-request.constants';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { canTransition } from '../../crm/lead/lead.validators';
import { InventoryMasterService } from '../inventory-master/inventory-master.service';
import { InventoryDeviceService } from '../inventory-device/inventory-device.service';
import { InventoryConsumableService } from '../inventory-consumable/inventory-consumable.service';

type InventoryRequestDocument = HydratedDocument<IInventoryRequest> | null;

const populate: any[] = [
    { path: 'requestedBy' },
    { path: 'processedBy' },
    // lineItems.item is polymorphic (refPath: itemType) — mongoose resolves the right model per line
    { path: 'lineItems.item' },
];

// ========================================================================================
// HELPERS
// ========================================================================================

// A non-manage actor (create/get/search/update only — e.g. a field officer) sees and edits only
// the requests they raised. A manage actor (approver/logistics) sees them all.
const applyOwnScope = (where: any, ctx: RequestContext) => {
    if (!ctx.hasAnyPermissions([INVENTORY_REQUEST_PERMISSIONS.MANAGE.code])) {
        where.requestedBy = ctx.role?._id || ctx.role?.id;
    }
};

// Confirm a referenced record exists, routing to the right service by itemType.
const itemExists = async (itemType: string, id: string, ctx: RequestContext) => {
    if (itemType === INVENTORY_REQUEST_ITEM_TYPE.MASTER) {
        return await InventoryMasterService.get(id, ctx);
    }
    if (itemType === INVENTORY_REQUEST_ITEM_TYPE.DEVICE) {
        return await InventoryDeviceService.get(id, ctx);
    }
    if (itemType === INVENTORY_REQUEST_ITEM_TYPE.CONSUMABLE) {
        return await InventoryConsumableService.get(id, ctx);
    }
    return null;
};

// Validate + normalize the polymorphic line list for a given request type:
//  • itemType↔request-type coherence (refill→master, return→device/consumable) — enforced HERE (service-only)
//  • every referenced record must exist (routed by itemType)
//  • dedupe within the list (a given record can't appear twice)
//  • a device line's quantity is always forced to 1 (a device is a single physical unit)
const resolveLineItems = async (
    lines: { itemType: string; item: string; quantity?: number }[],
    requestType: string,
    ctx: RequestContext,
) => {
    const allowedTypes = ALLOWED_ITEM_TYPES_BY_REQUEST_TYPE[requestType] || [];
    const seen = new Set<string>();
    const result: { itemType: string; item: string; quantity: number }[] = [];

    for (const line of lines) {
        //1: coherence — the line's itemType must be valid for this request type
        if (!allowedTypes.includes(line.itemType)) {
            return throwAppError(
                `A '${requestType}' request cannot include a '${line.itemType}' line`,
                StatusCodes.BAD_REQUEST,
            );
        }

        //2: dedupe within the list
        if (seen.has(line.item)) {
            return throwAppError('The same item is listed more than once', StatusCodes.BAD_REQUEST);
        }
        seen.add(line.item);

        //3: the referenced record must exist
        const record = await itemExists(line.itemType, line.item, ctx);
        if (!record) {
            return throwAppError(`${line.itemType} ${line.item} does not exist`, StatusCodes.NOT_FOUND);
        }

        //4: a device is a single physical unit — force quantity to 1; others use the supplied qty (default 1)
        const quantity = line.itemType === INVENTORY_REQUEST_ITEM_TYPE.DEVICE ? 1 : line.quantity ?? 1;
        result.push({ itemType: line.itemType, item: record._id.toString(), quantity });
    }

    return result;
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// requestedBy/type are seeded at construction in create() and never handled here, so update()
// can neither reassign the requester nor change the request type.
const set = async (model: any, entity: HydratedDocument<IInventoryRequest>, ctx: RequestContext) => {
    // entity.type is already set (seeded at construction on create; existing value on update),
    // so line coherence is validated against the request's own type.
    if (model.lineItems) {
        entity.lineItems = (await resolveLineItems(model.lineItems, entity.type as string, ctx)) as any;
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<InventoryRequestDocument> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    const where: any = { _id: id };
    applyOwnScope(where, ctx);

    const query = InventoryRequestModel.findOne(where);
    if (options?.populate) {
        query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchInventoryRequestQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    //1: no tenant scoping — the request is global (like the rest of the inventory domain)
    const where: any = {};

    //2: add search filters
    if (filters.type) {
        where.type = filters.type;
    }
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.requestedBy) {
        where.requestedBy = filters.requestedBy;
    }
    if (filters.processedBy) {
        where.processedBy = filters.processedBy;
    }
    if (filters.item) {
        where['lineItems.item'] = filters.item;
    }
    if (filters.itemType) {
        where['lineItems.itemType'] = filters.itemType;
    }

    //3: own-scope LAST so it always wins — a non-manage actor can never widen past their own
    //   requests by passing a requestedBy filter
    applyOwnScope(where, ctx);

    //4: execute count + data together
    const countPromise = InventoryRequestModel.countDocuments(where);
    const dataPromise = InventoryRequestModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateInventoryRequestPayload, ctx: RequestContext): Promise<HydratedDocument<IInventoryRequest>> => {
    //1: the request is raised by the actor for their own holdings — requestedBy (immutable) is the
    //   creator, seeded here and never handled in set(). type is also seeded here (immutable).
    let entity = new InventoryRequestModel({
        requestedBy: ctx.role?._id || ctx.role?.id,
        type: model.type,
    });

    //2: set validates + applies the line items (at least one is enforced in the validator, coherence in set)
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

const update = async (id: string, model: IUpdateInventoryRequestPayload, ctx: RequestContext) => {
    //1: get request first
    let request = await InventoryRequestService.get(id, ctx);
    if (!request) {
        return throwAppError('Request not found', StatusCodes.NOT_FOUND);
    }

    //2: lines can only be edited while the request is still pending approval
    if (request.status !== INVENTORY_REQUEST_STATUS.REQUESTED) {
        return throwAppError(`A request can only be edited while it is '${INVENTORY_REQUEST_STATUS.REQUESTED}'`, StatusCodes.CONFLICT);
    }

    //3: apply editable fields (requestedBy/type/status are not touched here)
    request = await set(model, request, ctx);
    request = await request.save();

    return request;
};

// moveStage is the ONLY path allowed to change a request's status.
const moveStage = async (id: string, model: IMoveStagePayload, ctx: RequestContext) => {
    //1: get request first
    let request = await InventoryRequestService.get(id, ctx);
    if (!request) {
        return throwAppError('Request not found', StatusCodes.NOT_FOUND);
    }

    const from = request.status as string;
    const to = model.to;

    //2: guard — no-op move
    if (from === to) {
        return throwAppError(`Request is already in the '${to}' stage`, StatusCodes.BAD_REQUEST);
    }

    //3: guard — transition must be allowed
    if (!canTransition(INVENTORY_REQUEST_TRANSITION_MAP, from, to)) {
        return throwAppError(`Invalid stage transition from '${from}' to '${to}'`, StatusCodes.BAD_REQUEST);
    }

    //3b: authorization — a manager (inventory-request:manage) may perform any valid transition
    //    (approve/reject/receive/cancel). A non-manage requester (already pinned to their OWN request
    //    by get's own-scope) may only:
    //      • refill  → cancel it, or confirm receipt of the stock (received)
    //      • return  → cancel it (the warehouse, not the FO, receives a return)
    if (!ctx.hasAnyPermissions([INVENTORY_REQUEST_PERMISSIONS.MANAGE.code])) {
        const allowed =
            request.type === INVENTORY_REQUEST_TYPE.REFILL
                ? [INVENTORY_REQUEST_STATUS.CANCELLED, INVENTORY_REQUEST_STATUS.RECEIVED]
                : [INVENTORY_REQUEST_STATUS.CANCELLED];
        if (!allowed.includes(to)) {
            return throwAppError(`You are not allowed to move this ${request.type} request to '${to}'`, StatusCodes.FORBIDDEN);
        }
    }

    //4: append to the append-only journal + flip the cached status (one atomic save)
    // snapshot the actor's identity from the token so history stays true even if the user/role later changes
    const actorName = `${ctx.user?.firstName || ''} ${ctx.user?.lastName || ''}`.trim();
    (request.stageHistory as any).push({
        from,
        to,
        reason: model.reason,
        actor: {
            roleId: ctx.role?._id || ctx.role?.id,
            name: actorName || undefined,
            email: ctx.user?.email,
        },
    });

    //5: record who processed the request when it leaves the requester's hands (approve/reject/receive)
    // FIXME: processedBy should ALWAYS be the inventory manager, but an FO confirming a refill 'received'
    // currently overwrites it with the FO. Gate this assignment on ctx.hasAnyPermissions([MANAGE]) so a
    // requester's receipt-confirmation can't clobber the approving manager. (Full trail is in stageHistory.)
    if (
        to === INVENTORY_REQUEST_STATUS.APPROVED ||
        to === INVENTORY_REQUEST_STATUS.REJECTED ||
        to === INVENTORY_REQUEST_STATUS.RECEIVED
    ) {
        request.processedBy = (ctx.role?._id || ctx.role?.id) as any;
    }

    request.status = to;
    request = await request.save();

    // NOTE: the actual stock movement on RECEIVED (refill → pull warehouse lots/devices,
    // return → restore the exact lot/unit) plus the InventoryTransaction ledger entry and the
    // InventoryAssignment delta are handled separately — not in this lifecycle service.

    return request;
};

export const InventoryRequestService = {
    get,
    search,
    create,
    update,
    moveStage,
};
