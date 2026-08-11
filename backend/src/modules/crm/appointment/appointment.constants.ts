// Appointment Constants

export const APPOINTMENT_TYPES = {
    NEW: 'new',
    FOLLOW_UP: 'follow-up',
    PAYMENT: 'payment',
    SPOT: 'spot',
} as const;

export const APPOINTMENT_MODES = {
    ONLINE: 'online',
    OFFLINE: 'offline',
    CALL: 'call',
} as const;

export const APPOINTMENT_STATUSES = {
    PLANNED: 'planned',
    DONE: 'done',
    CANCELLED: 'cancelled',
    RELEASED: 'released',
} as const;

export const APPOINTMENT_INVITE_STATUSES = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
} as const;

// MoM (minutes of meeting) must be submitted within this many WORKING hours of the meeting ending.
// Fed to calculateWorkingExpiry (skips nights/weekends), so it is not 24 wall-clock hours.
export const MOM_SUBMISSION_DEADLINE_HOURS = 24;

// entity key for the sequential appointment-code counter (seeded at startup, incremented on create)
export const APPOINTMENT_COUNTER_ENTITY = 'appointment';

// keyed by the stored status VALUE so moveStage can do APPOINTMENT_TRANSITION_MAP[appointment.status] directly.
// planned is the entry point; done/cancelled are terminal.
export const APPOINTMENT_TRANSITION_MAP: Record<string, string[]> = {
    [APPOINTMENT_STATUSES.PLANNED]: [APPOINTMENT_STATUSES.DONE, APPOINTMENT_STATUSES.CANCELLED],
    [APPOINTMENT_STATUSES.RELEASED]: [APPOINTMENT_STATUSES.PLANNED, APPOINTMENT_STATUSES.CANCELLED],
    [APPOINTMENT_STATUSES.DONE]: [],
    [APPOINTMENT_STATUSES.CANCELLED]: [],
};

// ============================================================
// ============= APPOINTMENT PERMISSIONS CONSTANTS ============
// ============================================================
export const APPOINTMENT_PERMISSIONS = {
    MANAGE: {
        code: 'appointment:manage',
        name: 'Manage Appointment',
        description: 'Manage appointments (full visibility)',
    } as const,

    SEARCH: {
        code: 'appointment:search',
        name: 'Search Appointment',
        description: 'View/search own appointments only',
    } as const,

    RSVP: {
        code: 'appointment:rsvp',
        name: 'RSVP Appointment',
        description: 'Respond (accept/decline) to appointment invites you are a member of',
    } as const,

    CREATE: {
        code: 'appointment:create',
        name: 'Create Appointment',
        description: 'Create appointments',
    } as const,

    UPDATE: {
        code: 'appointment:update',
        name: 'Update Appointment',
        description: 'Update appointments',
    } as const,

    GET: {
        code: 'appointment:get',
        name: 'Get Appointment',
        description: 'Get appointments',
    } as const,
};
