export const TENANT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export const TENANT_TYPE = {
    PLATFORM: 'platform',
    CUSTOMER: 'customer',
} as const;

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
