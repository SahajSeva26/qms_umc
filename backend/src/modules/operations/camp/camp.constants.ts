// Camp Constants

import { ALLOWED_ROLETYPE_CODES } from '../../access-management/role-type/roleType.constants';

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

export const CAMP_BUSINESS_ROLE_TYPES = [
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.CAMP_COORDINATOR_SCREENING,
        name: 'Camp Coordinator (Screening)',
        description: 'Screening camp coordinator — manages camps',
        permissions: [
            CAMP_PERMISSIONS.SEARCH.code,
            CAMP_PERMISSIONS.GET.code,
            CAMP_PERMISSIONS.CREATE.code,
            CAMP_PERMISSIONS.UPDATE.code,
            
        ],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.CAMP_COORDINATOR_DIET,
        name: 'Camp Coordinator (Diet)',
        description: 'Diet camp coordinator — manages camps',
        permissions: [
            CAMP_PERMISSIONS.SEARCH.code,
            CAMP_PERMISSIONS.GET.code,
            CAMP_PERMISSIONS.CREATE.code,
            CAMP_PERMISSIONS.UPDATE.code,
        ],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.OPERATION_MANAGER_SCREENING,
        name: 'Ops Manager Screening',
        description: 'Ops manager screening — view camps',
        permissions: [CAMP_PERMISSIONS.MANAGE.code],
    },
    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.OPERATION_MANAGER_DIET,
        name: 'Ops Manager Diet',
        description: 'Ops manager diet — view camps',
        permissions: [CAMP_PERMISSIONS.MANAGE.code],
    },

    {
        code: ALLOWED_ROLETYPE_CODES.PLATFORM.FIELD_OFFICER,
        name: 'Field Officer',
        description: 'Field officer — view camps',
        permissions: [CAMP_PERMISSIONS.SEARCH.code, CAMP_PERMISSIONS.GET.code],
    },
];
