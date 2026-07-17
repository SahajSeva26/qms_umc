import type { RoleTypeCode } from '@/types/accessManagement.types'

// Hardcoded mirror of the REAL backend enum
// (`backend/src/modules/access-management/role-type/roleType.constants.ts`
// -> ALLOWED_ROLETYPE_CODES / ALLOWED_ROLETYPE_CODES_ARRAY), which
// `CreateRoleTypePayloadSchema.code` (roleType.validators.ts) enforces via
// `z.enum(ALLOWED_ROLETYPE_CODES_ARRAY)`. Kept in exact sync with that
// backend source.
//
// NOTE on the `{tenantCode}.admin` exception: the backend seed script
// (shared/env/seedSystemUser.ts) creates exactly one RoleType with code
// `${SystemTenantCode}.admin` (e.g. "sahaj-seva.admin") by writing directly
// to Mongoose, bypassing `CreateRoleTypePayloadSchema` entirely — it is a
// reserved, system-seeded pattern, never something a tenant admin creates
// through this UI. Every code entered through this form must be one of the
// enum values below; the dotted `.admin` shape is only ever displayed
// read-only when it's already on an existing (seeded) RoleType.
export const ROLE_TYPE_CODE_GROUPS: { label: string; codes: RoleTypeCode[] }[] = [
  {
    label: 'Platform',
    codes: ['system', 'hr', 'admin', 'sales', 'sales-head'],
  },
  {
    label: 'Customer',
    codes: ['pharma-ho', 'pharma-ms', 'pharms-asm', 'pharma-rsm'],
  },
]

export const ROLE_TYPE_CODES: RoleTypeCode[] = ROLE_TYPE_CODE_GROUPS.flatMap((group) => group.codes)

/** Matches the backend's reserved `{tenantCode}.admin` seeded-RoleType code shape (read-only, never creatable here). */
export function isReservedTenantAdminCode(code: string, tenantCode?: string): boolean {
  if (tenantCode) return code === `${tenantCode}.admin`
  return /^[^.]+\.admin$/.test(code)
}
