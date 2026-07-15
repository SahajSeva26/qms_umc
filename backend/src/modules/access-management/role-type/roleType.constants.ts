export const ROLE_TYPE_STATUSES = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export const ALLOWED_ROLETYPE_CODES = {
    PLATFORM: {
        SYSTEM: 'system',
        HR: 'hr',
        ADMIN: 'admin',
        SALES: 'sales',
        SALES_HEAD: 'sales-head',
    },
    CUSTOMER: {
        PHARMA_HO: 'pharma-ho',
        PHARMA_MS: 'pharma-ms',
        PHARMS_ASM: 'pharms-asm',
        PHARMA_RSM: 'pharma-rsm',
    },
} as const;
export const ALLOWED_ROLETYPE_CODES_ARRAY = Object.values(ALLOWED_ROLETYPE_CODES).flatMap((group) =>
    Object.values(group),
) as [string, ...string[]];

// ========================================================
// ROLE TYPE PERMISSIONS
// ========================================================

export const ROLE_TYPE_PERMISSIONS = {
    GET: { code: 'role-type:get', name: 'Get Role Type', description: 'Get Role Type' },
    SEARCH: { code: 'role-type:search', name: 'Search Role Type', description: 'Search Role Type' },
    CREATE: { code: 'role-type:create', name: 'Create Role Type', description: 'Create Role Type' },
    UPDATE: { code: 'role-type:update', name: 'Update Role Type', description: 'Update Role Type' },
    MANAGE: { code: 'role-type:manage', name: 'Manage Role Type', description: 'Manage Role Type' },
} as const;
