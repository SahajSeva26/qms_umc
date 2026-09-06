// Inventory-assignment Service
import { HydratedDocument } from 'mongoose';
import { InventoryAssignmentModel, IInventoryAssignment } from './inventory-assignment.model';
import {
    ICreateInventoryAssignmentPayload,
    IInventoryAssignmentReportQuery,
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
import { RoleModel } from '../../access-management/role/role.model';
import { ROLE_STATUSES } from '../../access-management/role/role.constants';
import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';
import { INVENTORY_REQUEST_STATUS } from '../inventory-request/inventory-request.constants';
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

// Transaction-safe (findOne + single save/delete, no Promise.all). Moves stock into or out of an
// assignee's holding of a specific device/lot by `delta`:
//   • delta > 0 → increment the existing holding row, or create it if none exists (issue to FO)
//   • delta < 0 → decrement; remove the row when it hits 0 (withdraw from FO); errors if the FO
//                 doesn't hold enough (or any) — so the caller's transaction rolls back.
// This is the assignment side of every stock move; it does NOT touch device status / lot quantity.
const adjustHolding = async (
    assignee: string,
    inventoryType: string,
    inventory: string,
    delta: number,
    ctx: RequestContext,
): Promise<InventoryAssignmentDocument> => {
    const filter: any = { assignee, inventoryType, inventory };
    const row = await InventoryAssignmentModel.findOne(filter);

    if (delta >= 0) {
        if (row) {
            row.quantity += delta;
            return await row.save();
        }
        const entity = new InventoryAssignmentModel({ assignee, inventoryType, inventory, quantity: delta });
        return await entity.save();
    }

    // delta < 0: the assignee must actually hold enough to give back
    if (!row) {
        return throwAppError('The assignee does not hold this item', StatusCodes.CONFLICT);
    }
    const next = row.quantity + delta;
    if (next < 0) {
        return throwAppError('The assignee does not hold enough of this item', StatusCodes.CONFLICT);
    }
    if (next === 0) {
        await row.deleteOne();
        return null;
    }
    row.quantity = next;
    return await row.save();
};

// ========================================================================================
// REPORT (Phase 5 — field-officer roster, cross-feature)
// ========================================================================================
// Additive migration of the centralized inventory-report's FO-roster branch (fieldOfficers[],
// totalFieldOfficers, fieldOfficersHoldingInventory) into the feature that owns "who holds what".
//
// This is a genuinely cross-feature report and is a FAITHFUL PORT of the centralized report's
// facet-13 pipeline — same operators and projection math:
//  • BASE = roles (NOT inventoryassignments), so every active field officer appears, INCLUDING those
//    with zero holdings. Starting from assignments would drop zero-holding FOs.
//  • lookup #1 (roles → roletypes): active roles whose role type code is 'field-officer'.
//  • lookup #2 (roles → inventoryassignments, correlated on assignee): holdings grouped by
//    inventoryType — devicesHeld = grouped device-row COUNT (device qty is 1 by model invariant, so
//    count == device count — NOT sum(quantity)); consumableUnitsHeld = SUM(quantity) of consumable rows.
//  • lookup #3 (roles → inventoryrequests, correlated on requestedBy, status ∈ {requested,approved}):
//    awaitingApproval = count(requested), awaitingReceipt = count(approved). This correlated join is
//    per-FO (requestedBy === the FO being rendered) — it is NOT caller own-scope; applyOwnScope() is
//    never used. The endpoint is manager-gated (inventory-assignment:manage), so the report is global.
//  • sort by name ascending.
// No tenant filter / no ctx.where() — matches the centralized report's global behavior.
const report = async (_filters: IInventoryAssignmentReportQuery, _ctx: RequestContext) => {
    const DEVICE_TYPE = INVENTORY_ASSIGNMENT_TYPES.DEVICE;
    const CONSUMABLE_TYPE = INVENTORY_ASSIGNMENT_TYPES.CONSUMABLE;
    const REQUESTED = INVENTORY_REQUEST_STATUS.REQUESTED;
    const APPROVED = INVENTORY_REQUEST_STATUS.APPROVED;

    const fieldOfficers = await RoleModel.aggregate([
        // ── active roles only ────────────────────────────────────────────────────
        { $match: { status: ROLE_STATUSES.ACTIVE } },

        // ── identify field officers via their role type ──────────────────────────
        {
            $lookup: {
                from: 'roletypes',
                localField: 'type',
                foreignField: '_id',
                as: 'roleType',
            },
        },
        { $match: { 'roleType.code': ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER } },

        // ── holdings by type (correlated on assignee) ────────────────────────────
        {
            $lookup: {
                from: 'inventoryassignments',
                let: { roleId: '$_id' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$assignee', '$$roleId'] } } },
                    { $group: { _id: '$inventoryType', count: { $sum: 1 }, qty: { $sum: '$quantity' } } },
                ],
                as: 'holdingsByType',
            },
        },

        // ── pending/approved requests (correlated on requestedBy) ────────────────
        {
            $lookup: {
                from: 'inventoryrequests',
                let: { roleId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$requestedBy', '$$roleId'] },
                                    { $in: ['$status', [REQUESTED, APPROVED]] },
                                ],
                            },
                        },
                    },
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ],
                as: 'requestCounts',
            },
        },

        {
            $project: {
                name: 1,
                code: 1,
                // device assignment rows have quantity=1 by model invariant — group count equals device count.
                devicesHeld: {
                    $let: {
                        vars: {
                            g: {
                                $arrayElemAt: [
                                    { $filter: { input: '$holdingsByType', cond: { $eq: ['$$this._id', DEVICE_TYPE] } } },
                                    0,
                                ],
                            },
                        },
                        in: { $ifNull: ['$$g.count', 0] },
                    },
                },
                // consumable assignments store actual quantity — grouped sum across all lots held.
                consumableUnitsHeld: {
                    $let: {
                        vars: {
                            g: {
                                $arrayElemAt: [
                                    { $filter: { input: '$holdingsByType', cond: { $eq: ['$$this._id', CONSUMABLE_TYPE] } } },
                                    0,
                                ],
                            },
                        },
                        in: { $ifNull: ['$$g.qty', 0] },
                    },
                },
                // manager still needs to approve
                awaitingApproval: {
                    $let: {
                        vars: {
                            g: {
                                $arrayElemAt: [
                                    { $filter: { input: '$requestCounts', cond: { $eq: ['$$this._id', REQUESTED] } } },
                                    0,
                                ],
                            },
                        },
                        in: { $ifNull: ['$$g.count', 0] },
                    },
                },
                // manager already approved; FO has not yet confirmed receipt
                awaitingReceipt: {
                    $let: {
                        vars: {
                            g: {
                                $arrayElemAt: [
                                    { $filter: { input: '$requestCounts', cond: { $eq: ['$$this._id', APPROVED] } } },
                                    0,
                                ],
                            },
                        },
                        in: { $ifNull: ['$$g.count', 0] },
                    },
                },
            },
        },
        { $sort: { name: 1 } },
    ]);

    // derived summary — matches the centralized report's JS post-processing exactly.
    // "holding inventory" is decided ONLY by devicesHeld/consumableUnitsHeld — NOT by pending requests.
    const fieldOfficersHoldingInventory = fieldOfficers.filter(
        (fo: any) => fo.devicesHeld > 0 || fo.consumableUnitsHeld > 0,
    ).length;

    return {
        fieldOfficers,
        totalFieldOfficers: fieldOfficers.length,
        fieldOfficersHoldingInventory,
    };
};

export const InventoryAssignmentService = {
    get,
    search,
    create,
    update,
    remove,
    adjustHolding,
    report,
};
