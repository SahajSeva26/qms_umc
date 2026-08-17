// Inventory-assignment Service
import { HydratedDocument } from 'mongoose';
import { InventoryAssignmentModel, IInventoryAssignment } from './inventory-assignment.model';
import {
    ICreateInventoryAssignmentPayload,
    ISearchInventoryAssignmentQuery,
    IUpdateInventoryAssignmentPayload,
} from './inventory-assignment.validators';
import { INVENTORY_ASSIGNMENT_TYPES } from './inventory-assignment.constants';
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

const populate: any[] = [{ path: 'assignee' }, { path: 'inventory' }];

// ========================================================================================
// HELPERS
// ========================================================================================

// The referenced inventory item must exist. Which collection to look in depends on the row's type.
const assertInventoryExists = async (inventoryType: string, inventory: string, ctx: RequestContext) => {
    if (inventoryType === INVENTORY_ASSIGNMENT_TYPES.DEVICE) {
        const device = await InventoryDeviceService.get(inventory, ctx);
        if (!device) {
            return throwAppError('The referenced device does not exist', StatusCodes.NOT_FOUND);
        }
        return device;
    }
    const consumable = await InventoryConsumableService.get(inventory, ctx);
    if (!consumable) {
        return throwAppError('The referenced consumable does not exist', StatusCodes.NOT_FOUND);
    }
    return consumable;
};

// ========================================================================================
// CORE FUNCTIONS
// ========================================================================================

// identity (assignee + inventoryType + inventory) is seeded in create() and never handled here,
// so update() can only ever change the quantity.
const set = async (model: any, entity: HydratedDocument<IInventoryAssignment>, ctx: RequestContext) => {
    if (model.quantity !== undefined) {
        // a device is a single physical unit — its quantity is always 1.
        if (entity.inventoryType === INVENTORY_ASSIGNMENT_TYPES.DEVICE && model.quantity !== 1) {
            return throwAppError('A device holding always has a quantity of 1', StatusCodes.BAD_REQUEST);
        }
        entity.quantity = model.quantity;
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
    if (filters.inventoryType) {
        where.inventoryType = filters.inventoryType;
    }
    if (filters.inventory) {
        where.inventory = filters.inventory;
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

const create = async (
    model: ICreateInventoryAssignmentPayload,
    ctx: RequestContext,
): Promise<HydratedDocument<IInventoryAssignment>> => {
    //1: the assignee Role must exist (resolved through the actor's scope); populate to read its type code
    const assignee = await RoleService.get(model.assignee, ctx, { populate: true });
    if (!assignee) {
        return throwAppError('The assignee does not exist', StatusCodes.NOT_FOUND);
    }

    //1b: only a field officer can hold an inventory assignment
    if ((assignee.type as any)?.code !== ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER) {
        return throwAppError('The assignee must be a field officer', StatusCodes.BAD_REQUEST);
    }

    //2: the referenced inventory item must exist
    await assertInventoryExists(model.inventoryType, model.inventory, ctx);

    //3: resolve quantity — a device is always 1; a consumable must carry an explicit quantity
    let quantity = 1;
    if (model.inventoryType === INVENTORY_ASSIGNMENT_TYPES.CONSUMABLE) {
        if (!model.quantity) {
            return throwAppError('Quantity is required for a consumable', StatusCodes.BAD_REQUEST);
        }
        quantity = model.quantity;
    }

    //4: guard — one row per (assignee, inventoryType, inventory) (also enforced by the compound index)
    const existing = await InventoryAssignmentService.search(
        { assignee: model.assignee, inventoryType: model.inventoryType, inventory: model.inventory },
        ctx,
    );
    if (existing.count > 0) {
        return throwAppError('This item is already assigned to this assignee', StatusCodes.CONFLICT);
    }

    //5: build + save — identity is seeded here (immutable); set() only touches quantity later
    const entity = new InventoryAssignmentModel({
        assignee: model.assignee,
        inventoryType: model.inventoryType,
        inventory: model.inventory,
        quantity,
    });

    return await entity.save();
};

const update = async (id: string, model: IUpdateInventoryAssignmentPayload, ctx: RequestContext) => {
    //1: the row must exist
    let entity = await get(id, ctx);
    if (!entity) {
        return throwAppError('Assignment not found', StatusCodes.NOT_FOUND);
    }

    //2: apply editable fields (only quantity)
    entity = await set(model, entity, ctx);

    return await entity.save();
};

const remove = async (id: string, ctx: RequestContext) => {
    //1: the row must exist
    const entity = await get(id, ctx);
    if (!entity) {
        return throwAppError('Assignment not found', StatusCodes.NOT_FOUND);
    }

    //2: delete the holding row
    await entity.deleteOne();

    return entity;
};

export const InventoryAssignmentService = {
    get,
    search,
    create,
    update,
    remove,
};
