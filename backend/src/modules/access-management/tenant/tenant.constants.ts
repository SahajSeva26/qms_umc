// feeds the sequential tenant/client code (clt-000001) via the global counter module
import { IEntityFileConfig } from '../../../shared/types/file.types';

export const TENANT_COUNTER_ENTITY = 'tenant';

export const TENANT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export const TENANT_TYPE = {
    PLATFORM: 'platform',
    CUSTOMER: 'customer',
} as const;

// ================= TENANT FILE RELATIONS ===============

export const TENANT_FILE_ENTITY_TYPE = 'tenant';

// the file relations a tenant supports (just the logo for now)
export const TENANT_FILE_RELATIONS = {
    LOGO: 'logo',
} as const;

const TENANT_LOGO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const TENANT_LOGO_MAX_SIZE = 2 * 1024 * 1024; // 2 MB

// per-relation config: statuses during which it may be uploaded, cap, and per-file size/mime limits.
// logo cap is 1 — a new logo request discards the old one (replace), so only one ever exists.
export const TENANT_FILE_CONFIG: Record<string, IEntityFileConfig> = {
    [TENANT_FILE_RELATIONS.LOGO]: {
        relation: TENANT_FILE_RELATIONS.LOGO,
        statusAllowed: [TENANT_STATUS.ACTIVE],
        cap: 1,
        maxSize: TENANT_LOGO_MAX_SIZE,
        mimeTypes: TENANT_LOGO_MIME_TYPES,
    },
};

// ============================================================
// ==============TENANT PERMISSIONS CONSTANTS==================
// ============================================================
export const TENANT_PERMISSIONS = {
    CREATE: { code: 'tenant:create', name: 'Create Tenant', description: 'Create a new tenant' } as const,
    GET: { code: 'tenant:get', name: 'Get Tenant', description: 'Get a tenant' } as const,
    SEARCH: { code: 'tenant:search', name: 'Search Tenant', description: 'Search tenants' } as const,
    UPDATE: { code: 'tenant:update', name: 'Update Tenant', description: 'Update a tenant' } as const,
    //owner of tenant
    ADMIN: { code: 'tenant:admin', name: 'Admin Tenant', description: 'Admin tenant' } as const,

    MANAGE: { code: 'tenant:manage', name: 'Manage Tenant', description: 'Manage tenants' } as const,
};
