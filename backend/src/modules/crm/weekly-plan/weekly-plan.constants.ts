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
