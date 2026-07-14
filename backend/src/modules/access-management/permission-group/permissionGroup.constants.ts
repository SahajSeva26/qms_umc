export const PERMISSION_GROUP_STATUSES = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// ========================================================
// PERMISSION GROUP PERMISSIONS
// ========================================================
export const PERMISSION_GROUP_PERMISSIONS = {
    CREATE: {
        code: 'permission-group:create',
        name: 'Create Permission Group',
        description: 'Create Permission Group',
    },
    GET: { code: 'permission-group:get', name: 'Get Permission Group', description: 'Get Permission Group' },
    SEARCH: {
        code: 'permission-group:search',
        name: 'Search Permission Group',
        description: 'Search Permission Group',
    },
    UPDATE: {
        code: 'permission-group:update',
        name: 'Update Permission Group',
        description: 'Update Permission Group',
    },
    MANAGE: {
        code: 'permission-group:manage',
        name: 'Manage Permission Group',
        description: 'Manage Permission Group',
    },
};
