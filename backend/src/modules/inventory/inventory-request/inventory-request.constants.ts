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

// A line item is polymorphic (refPath) — these are the Mongoose MODEL names it can point at.
export const INVENTORY_REQUEST_ITEM_TYPE = {
    MASTER: 'InventoryMaster',
    DEVICE: 'InventoryDevice',
    CONSUMABLE: 'InventoryConsumable',
};

// Which line item types are valid for each request type:
//  • refill → the FO asks for a catalog item (they don't hold specific units yet) → master
//  • return → the FO returns actual stock they hold → device / consumable
export const ALLOWED_ITEM_TYPES_BY_REQUEST_TYPE: Record<string, string[]> = {
    [INVENTORY_REQUEST_TYPE.REFILL]: [INVENTORY_REQUEST_ITEM_TYPE.MASTER],
    [INVENTORY_REQUEST_TYPE.RETURN]: [INVENTORY_REQUEST_ITEM_TYPE.DEVICE, INVENTORY_REQUEST_ITEM_TYPE.CONSUMABLE],
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
