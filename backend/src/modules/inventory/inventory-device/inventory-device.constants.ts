// Inventory-device Constants
export const INVENTORY_DEVICE_LOCATION = {
    WAREHOUSE: 'warehouse',
    FO: 'field-officer',
    CAMP: 'camp',
};

export const INVENTORY_DEVICE_STATUS = {
    AVAILABLE: 'available',
    ASSIGNED: 'assigned',
    MAINTAINANCE: 'maintainance',
    LOST: 'lost',
    DMAGAED: 'damaged',
};

// ================= INVENTORY DEVICE PERMISSIONS CONSTANTS ===============

export const INVENTORY_DEVICE_PERMISSIONS = {
    MANAGE: {
        code: 'inventory-device:manage',
        name: 'Manage Inventory Device',
        description: 'Manage individual device units (create, update lifecycle/location/calibration)',
    } as const,
};
