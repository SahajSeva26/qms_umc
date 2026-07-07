export const PERMISSION_GROUP_STATUSES = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// ========================================================
// PERMISSION GROUP PERMISSIONS
// ========================================================
export const PERMISSION_GROUP_PERMISSIONS = {
    CREATE: { code: 'permission-group:create', name: 'Create Permission Group', description: 'Create Permission Group' },
    READ: { code: 'permission-group:read', name: 'Read Permission Group', description: 'Read Permission Group' },
    UPDATE: { code: 'permission-group:update', name: 'Update Permission Group', description: 'Update Permission Group' },
    DELETE: { code: 'permission-group:delete', name: 'Delete Permission Group', description: 'Delete Permission Group' },
    MANAGE: { code: 'permission-group:manage', name: 'Manage Permission Group', description: 'Manage Permission Group' },
} as const;
