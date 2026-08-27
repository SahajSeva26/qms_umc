// TestMaster Constants

export const TEST_MASTER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export const TEST_MASTER_CONFIG_INPUT_TYPE = {
    INT: 'int',
    FLOAT: 'float',
    STRING: 'string',
    BOOLEAN: 'boolean',
} as const;
export const TEST_MASTER_CONFIG_RESULT_LEVEL = {
    PASS: 'pass',
    WARNING: 'warning',
    FAIL: 'fail',
} as const;
export const TEST_MASTER_CONFIG_OPERATORS = {
    EQ: 'eq',
    NE: 'ne',
    GT: 'gt',
    GTE: 'gte',
    LT: 'lt',
    LTE: 'lte',
    BTW: 'btw',
} as const;
// ================= TEST MASTER PERMISSIONS CONSTANTS ===============

export const TEST_MASTER_PERMISSIONS = {
    MANAGE: {
        code: 'test-master:manage',
        name: 'Manage Test Master',
        description: 'Manage test master catalog records (full visibility, incl. inactive)',
    } as const,
};
