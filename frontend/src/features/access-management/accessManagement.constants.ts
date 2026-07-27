// Matches backend/src/modules/auth/auth.validators.ts's RegisterUserPayloadSchema.password
// (z.string().min(6)), which itself matches the Mongoose schema's own
// `minlength: 6` on User.password (backend/src/modules/user/user.model.ts).
// Every form embedding a RegisterOwnerPayload/RegisterUserPayload (tenant
// create, role create) must use this exact value — a stricter frontend
// minimum silently rejects passwords the backend would accept.
export const PASSWORD_MIN_LENGTH = 6

// Matches backend/src/shared/config/app.config.ts's `SystemTenantCode`
// (process.env.APP_SYSTEM_TENANT_CODE || 'qms') — the code of the one
// internal/platform Tenant every Sales Rep Role must belong to.
//
// tenant.mapper.ts's TenantMapper.toResponse only ever includes `type` on
// the wire for a caller holding system:manage — so `tenant.type ===
// 'platform'` (the "obvious" way to find this tenant) silently returns
// undefined for every other caller, including a real tenant:manage admin
// who should legitimately be able to pick a Sales Rep. Match on `code`
// instead — it's always present in TenantMapper's response regardless of
// caller permission — as a fallback alongside (not a replacement for) the
// type check, so this keeps working even for the one caller (system:manage)
// that already had `type` available. Found via a 2026-07-26 ground-up test
// pass: New Lead wizard / Edit Lead modal / CSV import / New Project wizard
// / Edit Project modal all had a permanently-empty Sales Rep picker for any
// non-system:manage account.
export const PLATFORM_TENANT_CODE = 'qms'
