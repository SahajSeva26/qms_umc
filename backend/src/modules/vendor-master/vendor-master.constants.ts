// Vendor-master Constants

export const VENDOR_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// ================= VENDOR MASTER PERMISSIONS CONSTANTS ===============
// Vendors are a global, platform-only registry — every endpoint (reads included)
// is permission-guarded, and the permissions below are only granted to platform
// role types. Customer/pharma actors never hold them, so they 403 on the whole module.

export const VENDOR_MASTER_PERMISSIONS = {
    MANAGE: {
        code: 'vendor-master:manage',
        name: 'Manage Vendor Master',
        description: 'Manage vendors (full visibility incl. inactive + all writes)',
    },
    CREATE: {
        code: 'vendor-master:create',
        name: 'Create Vendor',
        description: 'Create a vendor',
    },
    GET: {
        code: 'vendor-master:get',
        name: 'Get Vendor',
        description: 'Get a vendor (by id or code)',
    },
    SEARCH: {
        code: 'vendor-master:search',
        name: 'Search Vendors',
        description: 'Search vendors',
    },
    UPDATE: {
        code: 'vendor-master:update',
        name: 'Update Vendor',
        description: 'Update a vendor',
    },
} as const;
