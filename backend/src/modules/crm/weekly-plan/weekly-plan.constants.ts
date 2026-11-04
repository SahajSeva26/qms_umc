// Weekly-plan Constants
export const WEEKLY_PLAN_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
} as const;

export const WEEKLY_PLAN_TRANSITION_MAP: Record<string, string[]> = {
    [WEEKLY_PLAN_STATUS.PENDING]: [WEEKLY_PLAN_STATUS.APPROVED, WEEKLY_PLAN_STATUS.REJECTED],
    [WEEKLY_PLAN_STATUS.APPROVED]: [],
    [WEEKLY_PLAN_STATUS.REJECTED]: [WEEKLY_PLAN_STATUS.PENDING],
};

export const WEEKLY_PLAN_PERMISSIONS = {
    MANAGE: {
        code: 'weekly-plan:manage',
        name: 'Manage Weekly Plan',
        description: 'Manage weekly plans (full visibility)',
    } as const,

    SEARCH: {
        code: 'weekly-plan:search',
        name: 'Search Weekly Plan',
        description: 'View/search own weekly plans only',
    } as const,

    CREATE: {
        code: 'weekly-plan:create',
        name: 'Create Weekly Plan',
        description: 'Create weekly plans',
    } as const,

    UPDATE: {
        code: 'weekly-plan:update',
        name: 'Update Weekly Plan',
        description: 'Update own weekly plans + move stage (approve/reject)',
    } as const,

    GET: {
        code: 'weekly-plan:get',
        name: 'Get Weekly Plan',
        description: 'Get weekly plans',
    } as const,
};
