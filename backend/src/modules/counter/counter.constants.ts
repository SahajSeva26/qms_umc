// Counter Constants
export const COUNTER_RESET_POLICIES = {
    NEVER: 'never',
    DAILY: 'daily',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
} as const;

export const COUNTER_STATUSES= {
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
