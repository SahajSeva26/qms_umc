import { CAMP_PERMISSIONS } from '../../operations/camp/camp.constants';

export const ROLE_TYPE_STATUSES = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// pharma field force hold only camp:book — it is their single capability, and it also unlocks the
// camp + project read routes (which accept camp:book) so they can see what they need to book.
const PHARMA_CAMP_PERMISSIONS = [CAMP_PERMISSIONS.BOOK.code];

export const ALLOWED_ROLETYPE_CODES = {
    PLATFORM: {
        SYSTEM: 'system',
        // HR: 'hr',
        ADMIN: 'admin',

        SALES_REP: 'sales-rep',
        SALES_HEAD: 'sales-head',

        CAMP_COORDINATOR_SCREENING: 'camp-coordinator-screening',
        CAMP_COORDINATOR_DIET: 'camp-coordinator-diet',

        OPERATION_MANAGER_SCREENING: 'operation-manager-screening',
        OPERATION_MANAGER_DIET: 'operation-manager-diet',

        INVENTORY_MANAGER: 'inventory-manager',

        FINANCE_MANAGER: 'finance-manager',

        FIELD_OFFICER: 'field-officer',
    },
    CUSTOMER: {
        // PHARMA_HO: 'pharma-ho',
        PHARMA_DIVISION_HEAD: 'pharma-division-head',
        PHARMA_RSM: 'pharma-rsm',
        PHARMA_ASM: 'pharma-asm',
        PHARMA_MR: 'pharma-mr',
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
        code: ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_DIVISION_HEAD,
        name: 'Pharma Division Head',
        description: 'Pharma division head',
        permissions: [...PHARMA_CAMP_PERMISSIONS] as string[],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_RSM,
        name: 'Pharma RSM',
        description: 'Pharma regional sales manager',
        permissions: [...PHARMA_CAMP_PERMISSIONS] as string[],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_ASM,
        name: 'Pharma ASM',
        description: 'Pharma area sales manager',
        permissions: [...PHARMA_CAMP_PERMISSIONS] as string[],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.CUSTOMER.PHARMA_MR,
        name: 'Pharma MR',
        description: 'Pharma MR',
        permissions: [...PHARMA_CAMP_PERMISSIONS] as string[],
    },
];
