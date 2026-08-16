// Inventory-assignment Service
import { HydratedDocument } from 'mongoose';
import { InventoryAssignmentModel, IInventoryAssignment } from './inventory-assignment.model';
import {
    ICreateInventoryAssignmentPayload,
    ISearchInventoryAssignmentQuery,
    IUpdateInventoryAssignmentPayload,
} from './inventory-assignment.validators';
import { throwAppError } from '../../../shared/utils/error';
import { StatusCodes } from 'http-status-codes';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { isValidObjectID } from '../../../shared/utils/strings';
import { IServiceOptions } from '../../../shared/types/service.types';
import { RoleService } from '../../access-management/role/role.service';
import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';
import { InventoryDeviceService } from '../inventory-device/inventory-device.service';
import { InventoryConsumableService } from '../inventory-consumable/inventory-consumable.service';

type InventoryAssignmentDocument = HydratedDocument<IInventoryAssignment> | null;

const populate: any[] = [{ path: 'assignee' }, { path: 'devices.inventory' }, { path: 'consumables.inventory' }];

// ========================================================================================
// HELPERS
// ========================================================================================

// Validate every referenced device exists and dedupe within the list; quantity is fixed at 1.
const resolveDevices = async (lines: { inventory: string }[], ctx: RequestContext) => {
    const seen = new Set<string>();
    const result: { inventory: string; quantity: number }[] = [];
    for (const line of lines) {
        if (seen.has(line.inventory)) {
            return throwAppError('The same device is listed more than once', StatusCodes.BAD_REQUEST);
        }
        seen.add(line.inventory);

        const device = await InventoryDeviceService.get(line.inventory, ctx);
        if (!device) {
            return throwAppError(`Device ${line.inventory} does not exist`, StatusCodes.NOT_FOUND);
        }
        result.push({ inventory: device._id.toString(), quantity: 1 });
    }
    return result;
};

// Validate every referenced consumable lot exists and dedupe within the list.
const resolveConsumables = async (lines: { inventory: string; quantity: number }[], ctx: RequestContext) => {
    const seen = new Set<string>();
    const result: { inventory: string; quantity: number }[] = [];
    for (const line of lines) {
        if (seen.has(line.inventory)) {
            return throwAppError('The same consumable is listed more than once', StatusCodes.BAD_REQUEST);
        }
        seen.add(line.inventory);

        const consumable = await InventoryConsumableService.get(line.inventory, ctx);
        if (!consumable) {
            return throwAppError(`Consumable ${line.inventory} does not exist`, StatusCodes.NOT_FOUND);
        }
        result.push({ inventory: consumable._id.toString(), quantity: line.quantity });
    }
    return result;
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// assignee is seeded at construction in create() and never handled here, so update() can't reassign it.
const set = async (model: any, entity: HydratedDocument<IInventoryAssignment>, ctx: RequestContext) => {
    if (model.devices) {
        entity.devices = (await resolveDevices(model.devices, ctx)) as any;
    }
    if (model.consumables) {
        entity.consumables = (await resolveConsumables(model.consumables, ctx)) as any;
    }

    return entity;
};

const get = async (id: string, ctx: RequestContext, options?: IServiceOptions): Promise<InventoryAssignmentDocument> => {
    if (!isValidObjectID(id)) {
        return null;
    }

    const query = InventoryAssignmentModel.findOne({ _id: id });
    if (options?.populate) {
        query.populate(populate);
    }

    return await query;
};

const search = async (filters: ISearchInventoryAssignmentQuery, ctx: RequestContext, options?: IServiceOptions) => {
    const sort: any = { createdAt: -1 };

    //1: no tenant scoping — the assignment record is global (like the rest of the inventory domain)
    const where: any = {};

    //2: add search filters
    if (filters.assignee) {
        where.assignee = filters.assignee;
    }
    if (filters.device) {
        where['devices.inventory'] = filters.device;
    }
    if (filters.consumable) {
        where['consumables.inventory'] = filters.consumable;
    }

    //3: execute count + data together
    const countPromise = InventoryAssignmentModel.countDocuments(where);
    const dataPromise = InventoryAssignmentModel.find(where)
        .populate(populate)
        .limit(options?.pagination?.limit)
        .skip(options?.pagination?.skip)
        .sort(sort);

    const [count, items] = await Promise.all([countPromise, dataPromise]);

    return { count, items };
};

const create = async (model: ICreateInventoryAssignmentPayload, ctx: RequestContext): Promise<HydratedDocument<IInventoryAssignment>> => {
    //1: the assignee Role must exist (resolved through the actor's scope); populate so the
    //   role type code is available to check
    const assignee = await RoleService.get(model.assignee, ctx, { populate: true });
    if (!assignee) {
        return throwAppError('The assignee does not exist', StatusCodes.NOT_FOUND);
    }

    //1b: only a field officer can hold an inventory assignment
    if ((assignee.type as any)?.code !== ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER) {
        return throwAppError('The assignee must be a field officer', StatusCodes.BAD_REQUEST);
    }

    //2: guard — one assignment per assignee (assignee is the unique natural key)
    const existing = await InventoryAssignmentService.search({ assignee: model.assignee }, ctx);
    if (existing.count > 0) {
        return throwAppError('An assignment for this assignee already exists', StatusCodes.CONFLICT);
    }

    //3: build entity — assignee (immutable) is seeded here, never in set()
    let entity = new InventoryAssignmentModel({ assignee: model.assignee });
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

const update = async (assignee: string, model: IUpdateInventoryAssignmentPayload, ctx: RequestContext) => {
    //1: find the existing assignment for this assignee (guard invalid ids → treated as "missing")
    let entity: any = null;
    if (isValidObjectID(assignee)) {
        const existing = await InventoryAssignmentService.search({ assignee }, ctx);
        entity = existing.items[0];
    }

    //2: create-on-miss — delegate to create() so the assignee-exists + one-per-assignee
    if (!entity) {
        entity = await InventoryAssignmentService.create({ assignee }, ctx);
    }

    //3: apply editable fields (assignee is immutable — set() ignores it)
    entity = await set(model, entity, ctx);
    entity = await entity.save();

    return entity;
};

export const InventoryAssignmentService = {
    get,
    search,
    create,
    update,
};
