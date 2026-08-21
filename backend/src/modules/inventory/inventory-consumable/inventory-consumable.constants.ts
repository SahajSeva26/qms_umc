// Inventory-consumable Constants

const INVENTORY_CONSUMABLE_STATUS = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
} as const;

// ================= INVENTORY CONSUMABLE PERMISSIONS CONSTANTS ===============

const INVENTORY_CONSUMABLE_PERMISSIONS = {
    MANAGE: {
        code: 'inventory-consumable:manage',
        name: 'Manage Inventory Consumable',
        description: 'Manage consumable stock lots (full visibility, incl. expired)',
    } as const,
};

export { INVENTORY_CONSUMABLE_STATUS, INVENTORY_CONSUMABLE_PERMISSIONS };
