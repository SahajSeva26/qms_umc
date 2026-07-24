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
    BLOCKED: 'blocked',
    RELEASED: 'released',
} as const;
