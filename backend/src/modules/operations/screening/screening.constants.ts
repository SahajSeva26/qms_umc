// Screening Constants

export const SCREENING_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
} as const;

export type ScreeningStatus = (typeof SCREENING_STATUS)[keyof typeof SCREENING_STATUS];

// allowed stage transitions — pending is the only non-terminal state
export const SCREENING_TRANSITION_MAP: Record<string, string[]> = {
    [SCREENING_STATUS.PENDING]: [SCREENING_STATUS.COMPLETED, SCREENING_STATUS.CANCELLED],
    [SCREENING_STATUS.COMPLETED]: [],
    [SCREENING_STATUS.CANCELLED]: [],
};

// ================= SCREENING PERMISSIONS CONSTANTS ===============

export const SCREENING_PERMISSIONS = {
    MANAGE: {
        code: 'screening:manage',
        name: 'Manage Screening',
        description: 'Manage screenings (full visibility across the tenant)',
    } as const,

    CREATE: {
        code: 'screening:create',
        name: 'Create Screening',
        description: 'Create screenings',
    } as const,

    SEARCH: {
        code: 'screening:search',
        name: 'Search Screening',
        description: 'Search screenings',
    } as const,

    GET: {
        code: 'screening:get',
        name: 'Get Screening',
        description: 'Get a screening',
    } as const,

    UPDATE: {
        code: 'screening:update',
        name: 'Update Screening',
        description: 'Update screenings, move stage, and verify consent',
    } as const,
};
