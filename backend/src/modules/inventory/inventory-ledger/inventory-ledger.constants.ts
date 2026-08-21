// Inventory-ledger Constants

// where stock physically sits — every movement is recorded as a from → to between these.
export const INVENTORY_LEDGER_LOCATION = {
    WAREHOUSE: 'warehouse',
    IN_TRANSIT: 'in-transit',
    FIELD_OFFICER: 'field-officer',
} as const;

// the concrete inventory kinds a ledger row can reference (mongoose model names → refPath targets).
export const INVENTORY_LEDGER_ITEM_TYPE = {
    DEVICE: 'InventoryDevice',
    CONSUMABLE: 'InventoryConsumable',
} as const;

// ================= INVENTORY LEDGER PERMISSIONS CONSTANTS ===============

export const INVENTORY_LEDGER_PERMISSIONS = {
    MANAGE: {
        code: 'inventory-ledger:manage',
        name: 'Manage Inventory Ledger',
        description: 'Read the append-only inventory movement ledger',
    } as const,
};
