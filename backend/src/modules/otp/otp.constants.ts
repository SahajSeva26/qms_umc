// Otp Constants

export const OTP_STATUS = {
    PENDING: 'pending',
    VERIFIED: 'verified',
    EXPIRED: 'expired',
    BLOCKED: 'blocked',
}

// delivery channel the OTP is sent over
export const OTP_CHANNELS = {
    SMS: 'sms',
    WHATSAPP: 'whatsapp',
    EMAIL: 'email',
}

// entity types an OTP can be issued for
export const OTP_ENTITY_TYPE = {
    SCREENING: 'screening',
} as const;

// OTP purposes grouped by entity type — each entry carries its `purpose` string + the entity `relation`.
export const OTP_PURPOSES = {
    //screening
    [OTP_ENTITY_TYPE.SCREENING]: {
        CONSENT: { purpose: 'screening-consent', relation: 'consent' },
    },

    // Add more entity types and their purposes here
} as const;

// flat list of every purpose string across all entity types
export const OTP_PURPOSE_VALUES = Object.values(OTP_PURPOSES).flatMap((group) =>
    Object.values(group).map((entry) => entry.purpose),
);

// service defaults, applied when the caller doesn't override them
export const OTP_DEFAULTS = {
    EXPIRY_MINUTES: 5,
    // minimum gap between a resend and the previously issued OTP for the same target
    RESEND_COOLDOWN_SECONDS: 60,
}
