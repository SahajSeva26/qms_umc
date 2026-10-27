// Rating Constants

// ================= RATING PERMISSIONS CONSTANTS ===============

export const RATING_PERMISSIONS = {
    MANAGE: {
        code: 'rating:manage',
        name: 'Manage Rating',
        description: 'Manage camp ratings (full visibility across the tenant)',
    } as const,

    CREATE: {
        code: 'rating:create',
        name: 'Create Rating',
        description: 'Create camp ratings',
    } as const,

    SEARCH: {
        code: 'rating:search',
        name: 'Search Rating',
        description: 'Search camp ratings',
    } as const,

    GET: {
        code: 'rating:get',
        name: 'Get Rating',
        description: 'Get a camp rating',
    } as const,

    UPDATE: {
        code: 'rating:update',
        name: 'Update Rating',
        description: 'Update camp ratings',
    } as const,
};
