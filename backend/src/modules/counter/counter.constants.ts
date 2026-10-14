// Counter Constants
export const COUNTER_ENTITY_TYPES = {
    LEAD: 'lead',
    PROJECT: 'project',
    INVOICE: 'invoice',
    CAMP: 'camp',
    APPOINTMENT: 'appointment',
    // sequential code for tenant (client) records (clt-000001)
    TENANT: 'tenant',
    // sequential code for division records (div-000001)
    DIVISION: 'division',
    // generic fallback sequence for roles created without a code (rol-000001);
    // pharma field-force (MR/ASM/RSM) use PHARMA_ROLE instead
    ROLE: 'role',
    // universal sequence for pharma field-force roles (MR/ASM/RSM) created without an explicit code
    PHARMA_ROLE: 'pharma-role',
    // sequential code for test master catalog records (tst-000001)
    TEST_MASTER: 'test-master',
    // sequential code for patient registry records (pat-000001)
    PATIENT: 'patient',
};
export const COUNTER_RESET_POLICIES = {
    NEVER: 'never',
    DAILY: 'daily',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
} as const;

export const COUNTER_STATUSES = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

// ================= COUNTER PERMISSIONS CONSTANTS ===============

export const COUNTER_PERMISSIONS = {
    MANAGE: {
        code: 'counter:manage',
        name: 'Manage Counter',
        description: 'Manage counters (full visibility, incl. inactive)',
    } as const,
};
