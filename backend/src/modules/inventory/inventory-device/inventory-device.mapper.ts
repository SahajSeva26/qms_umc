// Inventory-device Mapper

// item may be a populated InventoryMaster doc or a raw ObjectId ref — surface a shallow shape either way.
const mapItem = (item: any) => {
    if (!item) return null;
    if (typeof item === 'object' && item._id) {
        return {
            id: item._id.toString(),
            code: item.code,
            name: item.name,
            sku: item.sku,
            unit: item.unit,
        };
    }
    return { id: item.toString() };
};

export const InventoryDeviceMapper = {
    toResponse: (device: any) => ({
        id: device._id?.toString(),

        // catalog item this unit is an instance of
        item: mapItem(device.item),

        // unit identity + lifecycle
        serialNumber: device.serialNumber,
        status: device.status,

        // shelf life / warranty
        manufacturingDate: device.manufacturingDate,
        warrantyExpiryDate: device.warrantyExpiryDate,

        // calibration
        lastCalibrationDate: device.lastCalibrationDate,
        nextCalibrationDate: device.nextCalibrationDate,

        createdAt: device.createdAt,
        updatedAt: device.updatedAt,
    }),
    toSearchResponse: (data: { count: number; items: any[] }) => ({
        count: data?.count || 0,
        items: (data?.items || []).map(InventoryDeviceMapper.toResponse),
    }),
};
