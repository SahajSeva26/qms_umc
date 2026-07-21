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

// ========================================================
// DEFAULT (FIXED) ROLE TYPES PROVISIONED PER CUSTOMER TENANT
// ========================================================
// Provisioned automatically when a CUSTOMER (pharma) tenant is onboarded, marked isSystem: true
// so their codes are reserved against custom creation. Permissions are empty for now — no
// pharma/camp permission module exists yet; fill these in when it lands.
export const DEFAULT_PHARMA_ROLE_TYPES = [
    {
        code: ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_HO,
        name: 'Pharma Head Office',
        description: 'Pharma head office',
        permissions: [] as string[],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_MS,
        name: 'Pharma MS',
        description: 'Pharma MS',
        permissions: [] as string[],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMS_ASM,
        name: 'Pharma ASM',
        description: 'Pharma area sales manager',
        permissions: [] as string[],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_RSM,
        name: 'Pharma RSM',
        description: 'Pharma regional sales manager',
        permissions: [] as string[],
    },
];
