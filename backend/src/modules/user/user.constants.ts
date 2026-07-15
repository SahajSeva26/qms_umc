// USER STATUSES
export const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    DELETED: 'deleted',
};

// USER GENDERS
export const USER_GENDERS = {
    MALE: 'male',
    FEMALE: 'female',
    OTHER: 'other',
};

// =========================================================
// ==============USER PERMISSIONS CONSTANTS==================
// =========================================================
export const USER_PERMISSIONS = {
    CREATE: { code: 'user:create', name: 'Create User', description: 'Create a new user' } as const,
    GET: { code: 'user:get', name: 'Get User', description: 'Get a user' } as const,
    SEARCH: { code: 'user:search', name: 'Search User', description: 'Search users' } as const,
    UPDATE: { code: 'user:update', name: 'Update User', description: 'Update a user' } as const,
    MANAGE: { code: 'user:manage', name: 'Manage User', description: 'Manage users' } as const,
};
