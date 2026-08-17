// Inventory-device Constants
export const INVENTORY_DEVICE_STATUS = {
    AVAILABLE: 'available',
    // reserved for an FO by an approved refill, but not yet received — out of the warehouse's
    // available pool, not yet an assignment. Flips to 'assigned' on receive, back to 'available' on
    // cancel-after-approve.
    IN_TRANSIT: 'in-transit',
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
        description: 'Manage individual device units (create, update lifecycle/calibration)',
    } as const,
};
