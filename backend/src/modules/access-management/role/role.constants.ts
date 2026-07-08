export const ROLE_STATUSES = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// ========================================================
// ROLE PERMISSIONS
// ========================================================
export const ROLE_PERMISSIONS = {
    GET: { code: 'role:get', name: 'Get Role', description: 'Get Role' },
    SEARCH: { code: 'role:search', name: 'Search Role', description: 'Search Role' },
    CREATE: { code: 'role:create', name: 'Create Role', description: 'Create Role' },
    UPDATE: { code: 'role:update', name: 'Update Role', description: 'Update Role' },
    MANAGE: { code: 'role:manage', name: 'Manage Role', description: 'Manage Role' },
} as const;
