// Test Constants

export const TEST_INTERPRETATION = {
    NORMAL: 'NORMAL',
    LOW: 'LOW',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL',
    INVALID: 'INVALID',
} as const;

// ================= TEST PERMISSIONS CONSTANTS ===============

export const TEST_PERMISSIONS = {
    MANAGE: {
        code: 'test:manage',
        name: 'Manage Test',
        description: 'Manage patient test records (full visibility across the tenant)',
    } as const,

    CREATE: {
        code: 'test:create',
        name: 'Create Test',
        description: 'Record patient test results',
    } as const,

    SEARCH: {
        code: 'test:search',
        name: 'Search Test',
        description: 'Search patient test records',
    } as const,

    GET: {
        code: 'test:get',
        name: 'Get Test',
        description: 'Get a patient test record',
    } as const,

    UPDATE: {
        code: 'test:update',
        name: 'Update Test',
        description: 'Update patient test results',
    } as const,
};
