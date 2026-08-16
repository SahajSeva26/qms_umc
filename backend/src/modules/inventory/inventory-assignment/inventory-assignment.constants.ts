// Inventory-assignment Constants

// ================= INVENTORY ASSIGNMENT PERMISSIONS CONSTANTS ===============

export const INVENTORY_ASSIGNMENT_PERMISSIONS = {
    MANAGE: {
        code: 'inventory-assignment:manage',
        name: 'Manage Inventory Assignment',
        description: 'Manage what inventory (devices/consumables) an assignee currently holds',
    } as const,
};
