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

// service defaults, applied when the caller doesn't override them
export const OTP_DEFAULTS = {
    EXPIRY_MINUTES: 5,
}
