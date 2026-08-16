// Inventory-request Constants
export const INVENTORY_REQUEST_STATUS = {
    REQUESTED: 'requested',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    RECEIVED: 'received',
    CANCELLED: 'cancelled',
};

export const INVENTORY_REQUEST_TRANSITION_MAP = {
    [INVENTORY_REQUEST_STATUS.REQUESTED]: [
        INVENTORY_REQUEST_STATUS.APPROVED,
        INVENTORY_REQUEST_STATUS.REJECTED,
        INVENTORY_REQUEST_STATUS.CANCELLED,
    ],
    [INVENTORY_REQUEST_STATUS.APPROVED]: [INVENTORY_REQUEST_STATUS.RECEIVED, INVENTORY_REQUEST_STATUS.CANCELLED],
    [INVENTORY_REQUEST_STATUS.REJECTED]: [INVENTORY_REQUEST_STATUS.REQUESTED],
    [INVENTORY_REQUEST_STATUS.RECEIVED]: [],
    [INVENTORY_REQUEST_STATUS.CANCELLED]: [],
};

export const INVENTORY_REQUEST_TYPE = {
    REFILL: 'refill',
    RETURN: 'return',
};

// ================= INVENTORY REQUEST PERMISSIONS CONSTANTS ===============

export const INVENTORY_REQUEST_PERMISSIONS = {
    CREATE: {
        code: 'inventory-request:create',
        name: 'Create Inventory Request',
        description: 'Raise inventory refill/return requests',
    } as const,
    GET: {
        code: 'inventory-request:get',
        name: 'Get Inventory Request',
        description: 'View a single inventory refill/return request',
    } as const,
    SEARCH: {
        code: 'inventory-request:search',
        name: 'Search Inventory Request',
        description: 'List/search inventory refill/return requests',
    } as const,
    UPDATE: {
        code: 'inventory-request:update',
        name: 'Update Inventory Request',
        description: 'Edit an inventory refill/return request while it is still requested',
    } as const,
    MANAGE: {
        code: 'inventory-request:manage',
        name: 'Manage Inventory Request',
        description: 'Progress (approve/reject/receive) inventory refill/return requests',
    } as const,
};
