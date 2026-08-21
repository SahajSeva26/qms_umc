// Inventory-assignment Constants

// ================= INVENTORY ASSIGNMENT TYPE (polymorphic refPath targets) ===============
// These values MUST equal the registered mongoose model names — they drive the `inventory`
// refPath on the model (device rows point at InventoryDevice, consumable rows at InventoryConsumable).
export const INVENTORY_ASSIGNMENT_TYPES = {
    DEVICE: 'InventoryDevice',
    CONSUMABLE: 'InventoryConsumable',
} as const;

// ================= INVENTORY ASSIGNMENT PERMISSIONS CONSTANTS ===============

export const INVENTORY_ASSIGNMENT_PERMISSIONS = {
    MANAGE: {
        code: 'inventory-assignment:manage',
        name: 'Manage Inventory Assignment',
        description: 'Manage what inventory (devices/consumables) an assignee currently holds',
    } as const,
};
