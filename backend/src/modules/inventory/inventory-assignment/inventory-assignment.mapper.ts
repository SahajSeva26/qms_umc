// Inventory-assignment Mapper
import { INVENTORY_ASSIGNMENT_TYPES } from './inventory-assignment.constants';

// assignee may be a populated Role doc or a raw ObjectId ref — surface a shallow shape either way.
const mapAssignee = (assignee: any) => {
    if (!assignee) return null;
    if (typeof assignee === 'object' && assignee._id) {
        return {
            id: assignee._id.toString(),
            name: assignee.name,
            code: assignee.code,
        };
    }
    return { id: assignee.toString() };
};

// the inventory ref may be a populated device/consumable doc or a raw ObjectId. Shape depends on type.
const mapInventory = (inventoryType: string, inv: any) => {
    if (!inv) return null;
    if (typeof inv !== 'object' || !inv._id) {
        return { id: inv.toString() };
    }
    if (inventoryType === INVENTORY_ASSIGNMENT_TYPES.DEVICE) {
        return { id: inv._id.toString(), serialNumber: inv.serialNumber, status: inv.status };
    }
    return { id: inv._id.toString(), batch: inv.batch, expiryDate: inv.expiryDate };
};

export const InventoryAssignmentMapper = {
    toResponse: (assignment: any) => ({
        id: assignment._id?.toString(),

        // the role holding the inventory
        assignee: mapAssignee(assignment.assignee),

        // the single holding on this row
        inventoryType: assignment.inventoryType,
        inventory: mapInventory(assignment.inventoryType, assignment.inventory),
        quantity: assignment.quantity,

        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
    }),
    toSearchResponse: (data: { count: number; items: any[] }) => ({
        count: data?.count || 0,
        items: (data?.items || []).map(InventoryAssignmentMapper.toResponse),
    }),

    // Phase 5 FO roster report. Shapes the aggregation result into the exact centralized contract:
    // each FO's _id becomes `role` (string id), name/code passed through untouched, every count
    // defaulting to 0. Order (name asc) is already applied in the aggregation — preserved here.
    toReportResponse: (report: any) => ({
        summary: {
            totalFieldOfficers: report?.totalFieldOfficers || 0,
            fieldOfficersHoldingInventory: report?.fieldOfficersHoldingInventory || 0,
        },
        fieldOfficers: (report?.fieldOfficers || []).map((fo: any) => ({
            role: fo._id?.toString(),
            name: fo.name,
            code: fo.code,
            devicesHeld: fo.devicesHeld || 0,
            consumableUnitsHeld: fo.consumableUnitsHeld || 0,
            awaitingApproval: fo.awaitingApproval || 0,
            awaitingReceipt: fo.awaitingReceipt || 0,
        })),
    }),
};
