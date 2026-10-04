// Otp Constants

export const OTP_STATUS = {
    PENDING: 'pending',
    VERIFIED: 'verified',
    EXPIRED: 'expired',
    BLOCKED: 'blocked',
}

// service defaults, applied when the caller doesn't override them
export const OTP_DEFAULTS = {
    CODE_LENGTH: 6,
    EXPIRY_MINUTES: 10,
    MAX_ATTEMPTS: 5,
}
