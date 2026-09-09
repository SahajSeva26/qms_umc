// Brand Constants

export const BRAND_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// ============================================================
// ================ BRAND PERMISSIONS CONSTANTS ==============
// ============================================================
export const BRAND_PERMISSIONS = {
    MANAGE: {
        code: 'brand:manage',
        name: 'Manage Brand',
        description: 'Manage brands (full visibility across tenants)',
    } as const,

    SEARCH: {
        code: 'brand:search',
        name: 'Search Brand',
        description: 'View/search brands',
    } as const,

    CREATE: {
        code: 'brand:create',
        name: 'Create Brand',
        description: 'Create brands',
    } as const,

    UPDATE: {
        code: 'brand:update',
        name: 'Update Brand',
        description: 'Update brands',
    } as const,

    GET: {
        code: 'brand:get',
        name: 'Get Brand',
        description: 'Get a brand',
    } as const,
};
