// Test Constants

export const TEST_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// ================= TEST PERMISSIONS CONSTANTS ===============

export const TEST_PERMISSIONS = {
    MANAGE: {
        code: 'test:manage',
        name: 'Manage Test',
        description: 'Manage test catalog records (full visibility, incl. inactive)',
    } as const,
};
