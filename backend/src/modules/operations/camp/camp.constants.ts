

// Camp Constants
import { IFileRelationConfig } from '../../../shared/types/file.types';

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

// ================= CAMP FILE CONFIG ===============
// The camp domain owns its file "purposes" and their rules; the generic file module knows none of
// this — it only receives { entityType, relation, cap }. Shared convention: every entity module
// declares its purposes like this (relation + cap satisfy the IFileRelationConfig contract).

// stored as entity.type on the file doc (free-form)
export const CAMP_FILE_ENTITY_TYPE = 'camp';

const CAMP_FILE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'];
const CAMP_FILE_MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type CampFilePurposeConfig = IFileRelationConfig & {
    cap: number;
    allowedMimeTypes: string[];
    maxSizeBytes: number;
    // camp statuses during which this purpose may be uploaded
    allowedCampStatuses: string[];
};

// keyed by the purpose code the frontend sends (e.g. "check-in-selfie")
export const CAMP_FILE_PURPOSES: Record<string, CampFilePurposeConfig> = {
    setup: {
        relation: 'setup',
        cap: 5,
        allowedMimeTypes: CAMP_FILE_IMAGE_MIME_TYPES,
        maxSizeBytes: CAMP_FILE_MAX_IMAGE_SIZE_BYTES,
        allowedCampStatuses: [CAMP_STATUSES.LIVE],
    },
    'check-in-selfie': {
        relation: 'check-in-selfie',
        cap: 1,
        allowedMimeTypes: CAMP_FILE_IMAGE_MIME_TYPES,
        maxSizeBytes: CAMP_FILE_MAX_IMAGE_SIZE_BYTES,
        allowedCampStatuses: [CAMP_STATUSES.LIVE],
    },
    closure: {
        relation: 'closure',
        cap: 3,
        allowedMimeTypes: CAMP_FILE_IMAGE_MIME_TYPES,
        maxSizeBytes: CAMP_FILE_MAX_IMAGE_SIZE_BYTES,
        allowedCampStatuses: [CAMP_STATUSES.LIVE, CAMP_STATUSES.CLOSED],
    },
};

export const CAMP_FILE_PURPOSE_KEYS = Object.keys(CAMP_FILE_PURPOSES) as [string, ...string[]];

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
