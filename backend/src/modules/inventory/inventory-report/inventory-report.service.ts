import { InventoryMasterModel } from '../inventory-master/inventory-master.model';
import { IInventoryReportQuery } from './inventory-report.validators';
import { RequestContext } from '../../../shared/utils/contextBuilder';
import { INVENTORY_REQUEST_STATUS } from '../inventory-request/inventory-request.constants';
import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';
import { ROLE_STATUSES } from '../../access-management/role/role.constants';
import { INVENTORY_ASSIGNMENT_TYPES } from '../inventory-assignment/inventory-assignment.constants';
import { INVENTORY_CONSUMABLE_STATUS } from '../inventory-consumable/inventory-consumable.constants';

const COLL = {
    DEVICE: 'inventorydevices',
    CONSUMABLE: 'inventoryconsumables',
    REQUEST: 'inventoryrequests',
    ROLE: 'roles',
    ROLE_TYPE: 'roletypes',
    ASSIGNMENT: 'inventoryassignments',
} as const;

const DEVICE_TYPE = INVENTORY_ASSIGNMENT_TYPES.DEVICE;
const CONSUMABLE_TYPE = INVENTORY_ASSIGNMENT_TYPES.CONSUMABLE;
const REQUESTED = INVENTORY_REQUEST_STATUS.REQUESTED;
const APPROVED = INVENTORY_REQUEST_STATUS.APPROVED;

const report = async (_filters: IInventoryReportQuery, _ctx: RequestContext) => {

    const now = new Date();

    const [result] = await InventoryMasterModel.aggregate([
        // ── Starting collection: InventoryMaster (catalog) ───────────────────────
        { $project: { _src: { $literal: 'master' }, type: 1, status: 1 } },

        // ── Device rows ───────────────────────────────────────────────────────────
        {
            $unionWith: {
                coll: COLL.DEVICE,
                pipeline: [{ $project: { _src: { $literal: 'device' }, status: 1 } }],
            },
        },

        // ── Consumable rows ───────────────────────────────────────────────────────
        {
            $unionWith: {
                coll: COLL.CONSUMABLE,
                pipeline: [
                    { $project: { _src: { $literal: 'consumable' }, status: 1, quantity: 1, expiryDate: 1 } },
                ],
            },
        },

        // ── Request rows ──────────────────────────────────────────────────────────
        {
            $unionWith: {
                coll: COLL.REQUEST,
                pipeline: [{ $project: { _src: { $literal: 'request' }, status: 1, type: 1 } }],
            },
        },

        // ── Field-officer Role rows ───────────────────────────────────────────────
        {
            $unionWith: {
                coll: COLL.ROLE,
                pipeline: [
                    { $match: { status: ROLE_STATUSES.ACTIVE } },
                    {
                        $lookup: {
                            from: COLL.ROLE_TYPE,
                            localField: 'type',
                            foreignField: '_id',
                            as: 'roleType',
                        },
                    },
                    { $match: { 'roleType.code': ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER } },
                    { $project: { _src: { $literal: 'fo' }, name: 1, code: 1 } },
                ],
            },
        },

        // ── Single $facet ─────────────────────────────────────────────────────────
        {
            $facet: {
                // catalog ─────────────────────────────────────────────────────────
                totalMaster: [{ $match: { _src: 'master' } }, { $count: 'count' }],
                catalogByType: [
                    { $match: { _src: 'master' } },
                    { $group: { _id: '$type', count: { $sum: 1 } } },
                ],
                catalogByStatus: [
                    { $match: { _src: 'master' } },
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ],

                // devices ─────────────────────────────────────────────────────────
                totalDevices: [{ $match: { _src: 'device' } }, { $count: 'count' }],
                deviceByStatus: [
                    { $match: { _src: 'device' } },
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ],

                // consumables ─────────────────────────────────────────────────────
                totalConsumableLots: [{ $match: { _src: 'consumable' } }, { $count: 'count' }],
                consumableByStatus: [
                    { $match: { _src: 'consumable' } },
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ],

                warehouseConsumableQty: [
                    { $match: { _src: 'consumable', status: INVENTORY_CONSUMABLE_STATUS.ACTIVE } },
                    { $group: { _id: null, total: { $sum: '$quantity' } } },
                ],

                expiredByDate: [
                    { $match: { _src: 'consumable', expiryDate: { $lt: now } } },
                    { $count: 'count' },
                ],

                // requests ────────────────────────────────────────────────────────
                totalRequests: [{ $match: { _src: 'request' } }, { $count: 'count' }],
                requestByStatus: [
                    { $match: { _src: 'request' } },
                    { $group: { _id: '$status', count: { $sum: 1 } } },
                ],
                requestByType: [
                    { $match: { _src: 'request' } },
                    { $group: { _id: '$type', count: { $sum: 1 } } },
                ],

                // field officers ──────────────────────────────────────────────────
                fieldOfficers: [
                    { $match: { _src: 'fo' } },
                    {
                        $lookup: {
                            from: COLL.ASSIGNMENT,
                            let: { roleId: '$_id' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$assignee', '$$roleId'] } } },
                                {
                                    $group: {
                                        _id: '$inventoryType',
                                        count: { $sum: 1 },
                                        qty: { $sum: '$quantity' },
                                    },
                                },
                            ],
                            as: 'holdingsByType',
                        },
                    },

                    {
                        $lookup: {
                            from: COLL.REQUEST,
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
                            // device assignment rows have quantity=1 by model invariant — group count
                            // equals device count.
                            devicesHeld: {
                                $let: {
                                    vars: {
                                        g: {
                                            $arrayElemAt: [
                                                {
                                                    $filter: {
                                                        input: '$holdingsByType',
                                                        cond: { $eq: ['$$this._id', DEVICE_TYPE] },
                                                    },
                                                },
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
                                                {
                                                    $filter: {
                                                        input: '$holdingsByType',
                                                        cond: { $eq: ['$$this._id', CONSUMABLE_TYPE] },
                                                    },
                                                },
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
                                                {
                                                    $filter: {
                                                        input: '$requestCounts',
                                                        cond: { $eq: ['$$this._id', REQUESTED] },
                                                    },
                                                },
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
                                                {
                                                    $filter: {
                                                        input: '$requestCounts',
                                                        cond: { $eq: ['$$this._id', APPROVED] },
                                                    },
                                                },
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
                ],
            },
        },
    ]);

    const requestStatusCounts = new Map<string, number>(
        (result?.requestByStatus || []).map((r: any) => [r._id, r.count]),
    );
    const pendingRequests = requestStatusCounts.get(REQUESTED) || 0;
    const fieldOfficers: any[] = result?.fieldOfficers || [];
    const fieldOfficersHoldingInventory = fieldOfficers.filter(
        (fo) => fo.devicesHeld > 0 || fo.consumableUnitsHeld > 0,
    ).length;

    return {
        ...result,
        derivedSummary: {
            catalogItems: result?.totalMaster?.[0]?.count || 0,
            totalDevices: result?.totalDevices?.[0]?.count || 0,
            consumableLots: result?.totalConsumableLots?.[0]?.count || 0,
            warehouseConsumableQuantity: result?.warehouseConsumableQty?.[0]?.total || 0,
            totalRequests: result?.totalRequests?.[0]?.count || 0,
            pendingRequests,
            totalFieldOfficers: fieldOfficers.length,
            fieldOfficersHoldingInventory,
        },
    };
};

export const InventoryReportService = { report };
