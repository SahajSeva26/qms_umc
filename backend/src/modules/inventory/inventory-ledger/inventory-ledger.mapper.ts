// Inventory-ledger Mapper
import { INVENTORY_LEDGER_ITEM_TYPE } from './inventory-ledger.constants';

// a Role ref (assignee) may be a populated doc or a raw ObjectId — surface a shallow shape either way.
const mapRole = (role: any) => {
    if (!role) {
        return null;
    }
    if (typeof role === 'object' && role._id) {
        return { id: role._id.toString(), name: role.name, code: role.code };
    }
    return { id: role.toString() };
};

// the request ref may be populated or raw.
const mapRequest = (req: any) => {
    if (!req) {
        return null;
    }
    if (typeof req === 'object' && req._id) {
        return { id: req._id.toString(), type: req.type, status: req.status };
    }
    return { id: req.toString() };
};

// the inventory ref is polymorphic — a populated device/consumable doc or a raw ObjectId.
const mapInventory = (inventoryType: string, inv: any) => {
    if (!inv) {
        return null;
    }
    if (typeof inv !== 'object' || !inv._id) {
        return { id: inv?.toString() };
    }
    if (inventoryType === INVENTORY_LEDGER_ITEM_TYPE.DEVICE) {
        return { id: inv._id.toString(), serialNumber: inv.serialNumber, status: inv.status };
    }
    return { id: inv._id.toString(), batch: inv.batch, expiryDate: inv.expiryDate };
};

export const InventoryLedgerMapper = {
    toResponse: (row: any) => ({
        id: row._id?.toString(),

        request: mapRequest(row.request),
        requestType: row.requestType,

        // what moved, how much, and in which direction
        inventoryType: row.inventoryType,
        inventory: mapInventory(row.inventoryType, row.inventory),
        quantity: row.quantity,
        from: row.from,
        to: row.to,

        // the FO on the field side of the movement + who performed it
        assignee: mapRole(row.assignee),
        actor: row.actor,

        createdAt: row.createdAt,
    }),
    toSearchResponse: (data: { count: number; items: any[] }) => ({
        count: data?.count || 0,
        items: (data?.items || []).map(InventoryLedgerMapper.toResponse),
    }),
};
