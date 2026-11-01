import type { RoleTypeCode } from '@/types/accessManagement.types'

// Mirror of the backend's known/default RoleType codes
// (`ALLOWED_ROLETYPE_CODES` in roleType.constants.ts) — drives the create
// form's fixed dropdown. The backend's own code field is actually a
// free-form kebab-case regex; this list just offers the known set instead of
// free text.
//
// `{tenantCode}.admin` (e.g. "sahaj-seva.admin") is a separate, reserved
// pattern seeded directly by seedSystemUser.ts, bypassing this list entirely
// — never creatable here, only ever shown read-only on an existing RoleType.
export const ROLE_TYPE_CODE_GROUPS: { label: string; codes: RoleTypeCode[] }[] = [
  {
    label: 'Platform',
    codes: [
      'system',
      'hr',
      'admin',
      'sales-rep',
      'sales-head',
      'camp-coordinator-screening',
      'camp-coordinator-diet',
      'operation-manager-screening',
      'operation-manager-diet',
      'field-officer',
    ],
  },
  {
    label: 'Customer',
    codes: ['pharma-division-head', 'pharma-asm', 'pharma-rsm', 'pharma-mr'],
  },
]

export const ROLE_TYPE_CODES: RoleTypeCode[] = ROLE_TYPE_CODE_GROUPS.flatMap((group) => group.codes)

/** Matches the backend's reserved `{tenantCode}.admin` seeded-RoleType code shape (read-only, never creatable here). */
export function isReservedTenantAdminCode(code: string, tenantCode?: string): boolean {
  if (tenantCode) return code === `${tenantCode}.admin`
  return /^[^.]+\.admin$/.test(code)
}
