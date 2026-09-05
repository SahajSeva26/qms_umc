// Camp Constants
export const CAMP_COUNTER_ENTITY = 'camp';

export const CAMP_TYPES = {
    SCREENING: 'screening',
    DIET: 'diet',
    LAB: 'lab',
} as const;

export type CampType = (typeof CAMP_TYPES)[keyof typeof CAMP_TYPES];

export const BILLING_TYPES = {
    BILLABLE: 'billable',
    VOID: 'void',
} as const;

export type BillingType = (typeof BILLING_TYPES)[keyof typeof BILLING_TYPES];

// the fixed set of bookable time slots — a camp occupies exactly one.
export const CAMP_TIME_SLOTS = {
    SLOT_9_1: '9am-1pm',
    SLOT_10_2: '10am-2pm',
    SLOT_11_3: '11am-3pm',
    SLOT_6_10: '6pm-10pm',
} as const;

export type CampTimeSlot = (typeof CAMP_TIME_SLOTS)[keyof typeof CAMP_TIME_SLOTS];

export const CAMP_STATUSES = {
    REQUESTED: 'requested',
    CONFIRMED: 'confirmed',
    LIVE: 'live',
    CLOSED: 'closed',
    CANCELLED: 'cancelled',
    CANCELLED_CHARGED: 'cancelled_charged',
} as const;

export type CampStatus = (typeof CAMP_STATUSES)[keyof typeof CAMP_STATUSES];

// Lifecycle state machine — a camp is requested, gets confirmed, goes live, then closes.
// A cancel (with or without charge) can happen up until the camp goes live; once live it can
// only close or be a chargeable cancel. All three end states are terminal.
export const CAMP_TRANSITION_MAP: Record<string, string[]> = {
    [CAMP_STATUSES.REQUESTED]: [CAMP_STATUSES.CONFIRMED, CAMP_STATUSES.CANCELLED, CAMP_STATUSES.CANCELLED_CHARGED],
    [CAMP_STATUSES.CONFIRMED]: [CAMP_STATUSES.LIVE, CAMP_STATUSES.CANCELLED, CAMP_STATUSES.CANCELLED_CHARGED],
    [CAMP_STATUSES.LIVE]: [CAMP_STATUSES.CLOSED, CAMP_STATUSES.CANCELLED_CHARGED],
    [CAMP_STATUSES.CLOSED]: [],
    [CAMP_STATUSES.CANCELLED]: [],
    [CAMP_STATUSES.CANCELLED_CHARGED]: [],
};

// ================= CAMP PERMISSIONS CONSTANTS ===============

export const CAMP_PERMISSIONS = {
    MANAGE: {
        code: 'camp:manage',
        name: 'Manage Camp',
        description: 'Manage camps (full visibility across the tenant)',
    } as const,

    SEARCH: {
        code: 'camp:search',
        name: 'Search Camp',
        description: 'View/search only camps the actor is assigned to (fo/mr/asm/rsm)',
    } as const,

    CREATE: {
        code: 'camp:create',
        name: 'Create Camp',
        description: 'Create camps',
    } as const,

    BOOK: {
        code: 'camp:book',
        name: 'Book Camp',
        description: 'Book a camp for an MR (pharma field force — self or downline)',
    } as const,

    UPDATE: {
        code: 'camp:update',
        name: 'Update Camp',
        description: 'Update camps',
    } as const,

    GET: {
        code: 'camp:get',
        name: 'Get Camp',
        description: 'Get camps',
    } as const,
};

//============================================================
// CAMP BUSINESS ROLE TYPES
//============================================================

// ================= CAMP REPORT CONSTANTS ===============


export const CAMP_REPORT_DEFAULT_PAST_DAYS = 180;
export const CAMP_REPORT_DEFAULT_FUTURE_DAYS = 90;
export const CAMP_REPORT_STALE_LIVE_GRACE_DAYS = 1;
export const CAMP_REPORT_IMMINENT_DAYS = 7;

export const CAMP_NON_TERMINAL_STATUSES: string[] = [
    CAMP_STATUSES.REQUESTED,
    CAMP_STATUSES.CONFIRMED,
    CAMP_STATUSES.LIVE,
];

export const CAMP_CANCELLED_STATUSES: string[] = [CAMP_STATUSES.CANCELLED, CAMP_STATUSES.CANCELLED_CHARGED];

export const CAMP_REPORT_EXCEPTIONS = [
    {
        code: 'CAMP_UNALLOCATED_IMMINENT',
        severity: 'critical',
        label: 'Unallocated camps scheduled within 7 days',
    },
    {
        code: 'CAMP_STALE_LIVE',
        severity: 'critical',
        label: 'Camps still live after their scheduled date',
    },
    {
        code: 'CAMP_STALE_CONFIRMED',
        severity: 'high',
        label: 'Confirmed camps whose scheduled date has passed without going live',
    },
    {
        code: 'CAMP_UNALLOCATED',
        severity: 'high',
        label: 'Camps with no field officer assigned',
    },
    {
        code: 'CAMP_NO_PROJECT',
        severity: 'medium',
        label: 'Camps not linked to a project',
    },
    {
        code: 'CAMP_NO_COORDINATES',
        severity: 'medium',
        label: 'Camps with no coordinates',
    },
] as const;
