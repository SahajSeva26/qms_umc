// TestMaster Constants

// feeds the sequential test master code (tst-000001) via the global counter module
export const TEST_MASTER_COUNTER_ENTITY = 'test-master';

export const TEST_MASTER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export const TEST_MASTER_CONFIG_INPUT_TYPE = {
    NUMBER:'number',
    STRING: 'string',
    BOOLEAN: 'boolean',
    SELECT: 'select',
} as const;


// ================= TEST MASTER PERMISSIONS CONSTANTS ===============

export const TEST_MASTER_PERMISSIONS = {
    MANAGE: {
        code: 'test-master:manage',
        name: 'Manage Test Master',
        description: 'Manage test master catalog records (full visibility, incl. inactive)',
    } as const,

    SEARCH: {
        code: 'test-master:search',
        name: 'Search Test Master',
        description: 'Search test master catalog records',
    } as const,

    GET: {
        code: 'test-master:get',
        name: 'Get Test Master',
        description: 'Get a test master catalog record',
    } as const,
};
