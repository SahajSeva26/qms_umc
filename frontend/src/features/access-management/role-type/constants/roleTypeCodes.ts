import type { RoleTypeCode } from '@/types/accessManagement.types'

// Mirror of the backend's KNOWN/default RoleType codes
// (`backend/src/modules/access-management/role-type/roleType.constants.ts`
// -> ALLOWED_ROLETYPE_CODES). NOTE: the backend no longer enforces a fixed
// enum here — `CreateRoleTypePayloadSchema.code` (roleType.validators.ts) is
// a free-form kebab-case regex, `/^[a-z][a-z0-9-]*$/` (reserved/default codes
// are blocked in the service layer via an isSystem lookup, not by
// restricting the input set). This list still drives the create form's fixed
// dropdown (offering exactly the backend's own known codes rather than a
// free-text input, which would be a larger widget-shape change) — was found
// stale via a 2026-07-24 test sweep: missing all 5 real operations codes
// (camp-coordinator-*, operation-manager-*, field-officer), 'sales' was wrong
// (real code is 'sales-rep'), and 2 pharma codes were typo'd ('pharma-ms',
// 'pharms-asm' instead of 'pharma-mr', 'pharma-asm'). All corrected below.
//
// NOTE on the `{tenantCode}.admin` exception: the backend seed script
// (shared/env/seedSystemUser.ts) creates exactly one RoleType with code
// `${SystemTenantCode}.admin` (e.g. "sahaj-seva.admin") by writing directly
// to Mongoose, bypassing `CreateRoleTypePayloadSchema` entirely — it is a
// reserved, system-seeded pattern, never something a tenant admin creates
// through this UI. The dotted `.admin` shape is only ever displayed
// read-only when it's already on an existing (seeded) RoleType.
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
