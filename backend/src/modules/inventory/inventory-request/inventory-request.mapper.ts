// Inventory-request Mapper

// a Role ref (requestedBy/processedBy) may be a populated doc or a raw ObjectId — surface a shallow shape either way.
const mapRole = (role: any) => {
    if (!role) return null;
    if (typeof role === 'object' && role._id) {
        return { id: role._id.toString(), name: role.name, code: role.code };
    }
    return { id: role.toString() };
};

// a device ref may be a populated InventoryDevice doc or a raw ObjectId.
const mapDeviceLine = (line: any) => {
    const inv = line.item;
    const device =
        inv && typeof inv === 'object' && inv._id
            ? { id: inv._id.toString(), serialNumber: inv.serialNumber, status: inv.status, location: inv.location }
            : { id: inv?.toString() };
    return { item: device, quantity: line.quantity };
};

// a consumable ref may be a populated InventoryConsumable doc or a raw ObjectId.
const mapConsumableLine = (line: any) => {
    const inv = line.item;
    const consumable =
        inv && typeof inv === 'object' && inv._id
            ? { id: inv._id.toString(), batch: inv.batch, expiryDate: inv.expiryDate }
            : { id: inv?.toString() };
    return { item: consumable, quantity: line.quantity };
};

export const InventoryRequestMapper = {
    toResponse: (request: any) => ({
        id: request._id?.toString(),

        type: request.type,
        status: request.status,

        // the field officer who raised the request, and whoever processed it
        requestedBy: mapRole(request.requestedBy),
        processedBy: mapRole(request.processedBy),

        // requested lines
        devices: (request.devices || []).map(mapDeviceLine),
        consumables: (request.consumables || []).map(mapConsumableLine),

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
