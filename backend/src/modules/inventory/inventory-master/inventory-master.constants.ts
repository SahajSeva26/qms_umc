// Inventory-master Constants

export const ITEM_TYPES = {
    DEVICE: 'device',
    CONSUMABLE: 'consumable',
    ACCESSORY: 'accessory',
    OTHER: 'other',
} as const;

export const ITEM_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// ================= INVENTORY MASTER PERMISSIONS CONSTANTS ===============

export const INVENTORY_MASTER_PERMISSIONS = {
    MANAGE: {
        code: 'inventory-master:manage',
        name: 'Manage Inventory Master',
        description: 'Manage inventory master items (full visibility, incl. inactive)',
    } as const,
};
