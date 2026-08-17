// Inventory-request Mapper
import { INVENTORY_REQUEST_ITEM_TYPE } from './inventory-request.constants';

// a Role ref (requestedBy/processedBy) may be a populated doc or a raw ObjectId — surface a shallow shape either way.
const mapRole = (role: any) => {
    if (!role) return null;
    if (typeof role === 'object' && role._id) {
        return { id: role._id.toString(), name: role.name, code: role.code };
    }
    return { id: role.toString() };
};

// a line's item is polymorphic — a populated Master/Device/Consumable doc or a raw ObjectId.
// surface a shallow shape with the fields that identify each type.
const mapItem = (itemType: string, inv: any) => {
    if (!inv) return null;
    if (typeof inv !== 'object' || !inv._id) {
        return { id: inv?.toString() };
    }
    const base = { id: inv._id.toString() };
    if (itemType === INVENTORY_REQUEST_ITEM_TYPE.DEVICE) {
        return { ...base, serialNumber: inv.serialNumber, status: inv.status };
    }
    if (itemType === INVENTORY_REQUEST_ITEM_TYPE.CONSUMABLE) {
        return { ...base, batch: inv.batch, expiryDate: inv.expiryDate };
    }
    if (itemType === INVENTORY_REQUEST_ITEM_TYPE.MASTER) {
        return { ...base, code: inv.code, name: inv.name, type: inv.type };
    }
    return base;
};

const mapLine = (line: any) => ({
    itemType: line.itemType,
    item: mapItem(line.itemType, line.item),
    quantity: line.quantity,
});

export const InventoryRequestMapper = {
    toResponse: (request: any) => ({
        id: request._id?.toString(),

        type: request.type,
        status: request.status,

        // the field officer who raised the request, and whoever processed it
        requestedBy: mapRole(request.requestedBy),
        processedBy: mapRole(request.processedBy),

        // requested lines (polymorphic — master for refill, device/consumable for return)
        lineItems: (request.lineItems || []).map(mapLine),

        // append-only lifecycle journal
        stageHistory: (request.stageHistory || []).map((entry: any) => ({
            from: entry.from,
            to: entry.to,
            reason: entry.reason,
            actor: entry.actor,
        })),

        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
    }),
    toSearchResponse: (data: { count: number; items: any[] }) => ({
        count: data?.count || 0,
        items: (data?.items || []).map(InventoryRequestMapper.toResponse),
    }),
};
