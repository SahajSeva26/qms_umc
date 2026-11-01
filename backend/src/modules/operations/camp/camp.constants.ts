

// Camp Constants
import { IEntityFileConfig } from '../../../shared/types/file.types';

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

// ================= CAMP FILE RELATIONS ===============

export const CAMP_FILE_ENTITY_TYPE = 'camp';

// the file relations a camp supports
export const CAMP_FILE_RELATIONS = {
    SETUP: 'setup',
    CHECK_IN_SELFIE: 'check-in-selfie',
    CLOSURE: 'closure',
} as const;

// allowed image types + max bytes per camp photo (all relations are photos)
const CAMP_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CAMP_PHOTO_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// per-relation config: the relation + the camp statuses during which it may be uploaded, the cap,
// and the per-file size/mime-type constraints
export const CAMP_FILE_CONFIG: Record<string, IEntityFileConfig> = {
    [CAMP_FILE_RELATIONS.SETUP]: {
        relation: CAMP_FILE_RELATIONS.SETUP,
        statusAllowed: [CAMP_STATUSES.LIVE],
        cap: 5,
        maxSize: CAMP_PHOTO_MAX_SIZE,
        mimeTypes: CAMP_PHOTO_MIME_TYPES,
    },
    [CAMP_FILE_RELATIONS.CHECK_IN_SELFIE]: {
        relation: CAMP_FILE_RELATIONS.CHECK_IN_SELFIE,
        statusAllowed: [CAMP_STATUSES.LIVE],
        cap: 1,
        maxSize: CAMP_PHOTO_MAX_SIZE,
        mimeTypes: CAMP_PHOTO_MIME_TYPES,
    },
    [CAMP_FILE_RELATIONS.CLOSURE]: {
        relation: CAMP_FILE_RELATIONS.CLOSURE,
        statusAllowed: [CAMP_STATUSES.LIVE, CAMP_STATUSES.CLOSED],
        cap: 3,
        maxSize: CAMP_PHOTO_MAX_SIZE,
        mimeTypes: CAMP_PHOTO_MIME_TYPES,
    },
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
