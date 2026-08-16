// Inventory-assignment Mapper

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

// a device ref may be a populated InventoryDevice doc or a raw ObjectId.
const mapDeviceLine = (line: any) => {
    const inv = line.inventory;
    const device =
        inv && typeof inv === 'object' && inv._id
            ? { id: inv._id.toString(), serialNumber: inv.serialNumber, status: inv.status, location: inv.location }
            : { id: inv?.toString() };
    return { inventory: device, quantity: line.quantity };
};

// a consumable ref may be a populated InventoryConsumable doc or a raw ObjectId.
const mapConsumableLine = (line: any) => {
    const inv = line.inventory;
    const consumable =
        inv && typeof inv === 'object' && inv._id
            ? { id: inv._id.toString(), batch: inv.batch, expiryDate: inv.expiryDate }
            : { id: inv?.toString() };
    return { inventory: consumable, quantity: line.quantity };
};

export const InventoryAssignmentMapper = {
    toResponse: (assignment: any) => ({
        id: assignment._id?.toString(),

        // the role holding the inventory
        assignee: mapAssignee(assignment.assignee),

        // current holdings
        devices: (assignment.devices || []).map(mapDeviceLine),
        consumables: (assignment.consumables || []).map(mapConsumableLine),

        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
    }),
    toSearchResponse: (data: { count: number; items: any[] }) => ({
        count: data?.count || 0,
        items: (data?.items || []).map(InventoryAssignmentMapper.toResponse),
    }),
};
