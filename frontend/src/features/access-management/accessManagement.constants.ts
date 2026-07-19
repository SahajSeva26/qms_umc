// Matches backend/src/modules/auth/auth.validators.ts's RegisterUserPayloadSchema.password
// (z.string().min(6)), which itself matches the Mongoose schema's own
// `minlength: 6` on User.password (backend/src/modules/user/user.model.ts).
// Every form embedding a RegisterOwnerPayload/RegisterUserPayload (tenant
// create, role create) must use this exact value — a stricter frontend
// minimum silently rejects passwords the backend would accept.
export const PASSWORD_MIN_LENGTH = 6
