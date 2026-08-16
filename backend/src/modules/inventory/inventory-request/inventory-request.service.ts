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
import { InventoryDeviceService } from '../inventory-device/inventory-device.service';
import { InventoryConsumableService } from '../inventory-consumable/inventory-consumable.service';

type InventoryRequestDocument = HydratedDocument<IInventoryRequest> | null;

const populate: any[] = [
    { path: 'requestedBy' },
    { path: 'processedBy' },
    { path: 'devices.item' },
    { path: 'consumables.item' },
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

// Validate every referenced device exists and dedupe within the list; quantity is fixed at 1.
const resolveDevices = async (lines: { item: string }[], ctx: RequestContext) => {
    const seen = new Set<string>();
    const result: { item: string; quantity: number }[] = [];
    for (const line of lines) {
        if (seen.has(line.item)) {
            return throwAppError('The same device is listed more than once', StatusCodes.BAD_REQUEST);
        }
        seen.add(line.item);

        const device = await InventoryDeviceService.get(line.item, ctx);
        if (!device) {
            return throwAppError(`Device ${line.item} does not exist`, StatusCodes.NOT_FOUND);
        }
        result.push({ item: device._id.toString(), quantity: 1 });
    }
    return result;
};

// Validate every referenced consumable lot exists and dedupe within the list.
const resolveConsumables = async (lines: { item: string; quantity: number }[], ctx: RequestContext) => {
    const seen = new Set<string>();
    const result: { item: string; quantity: number }[] = [];
    for (const line of lines) {
        if (seen.has(line.item)) {
            return throwAppError('The same consumable is listed more than once', StatusCodes.BAD_REQUEST);
        }
        seen.add(line.item);

        const consumable = await InventoryConsumableService.get(line.item, ctx);
        if (!consumable) {
            return throwAppError(`Consumable ${line.item} does not exist`, StatusCodes.NOT_FOUND);
        }
        result.push({ item: consumable._id.toString(), quantity: line.quantity });
    }
    return result;
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// requestedBy/type are seeded at construction in create() and never handled here, so update()
// can neither reassign the requester nor change the request type.
const set = async (model: any, entity: HydratedDocument<IInventoryRequest>, ctx: RequestContext) => {
    if (model.devices) {
        entity.devices = (await resolveDevices(model.devices, ctx)) as any;
    }
    if (model.consumables) {
        entity.consumables = (await resolveConsumables(model.consumables, ctx)) as any;
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
    if (filters.device) {
        where['devices.item'] = filters.device;
    }
    if (filters.consumable) {
        where['consumables.item'] = filters.consumable;
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

    //2: set validates + applies the device/consumable lines (at least one is enforced in the validator)
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
