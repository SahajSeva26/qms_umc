// Contact Constants

export const CONTACT_TYPES = {
    CUSTOMER: 'customer', // a pharma / customer-side person (product manager, coordinator, etc.)
    PLATFORM: 'platform', // a QMS-internal (platform) person recorded as a contact
} as const;

export const CONTACT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// ============================================================
// ================ CONTACT PERMISSIONS CONSTANTS =============
// ============================================================
export const CONTACT_PERMISSIONS = {
    MANAGE: {
        code: 'contact:manage',
        name: 'Manage Contact',
        description: 'Manage contacts (full visibility across tenants)',
    } as const,

    SEARCH: {
        code: 'contact:search',
        name: 'Search Contact',
        description: 'View/search contacts',
    } as const,

    CREATE: {
        code: 'contact:create',
        name: 'Create Contact',
        description: 'Create contacts',
    } as const,

    UPDATE: {
        code: 'contact:update',
        name: 'Update Contact',
        description: 'Update contacts',
    } as const,

    GET: {
        code: 'contact:get',
        name: 'Get Contact',
        description: 'Get a contact',
    } as const,
};
