// Mirrors backend/src/shared/middlewares/roleGuard.ts's EMPLOYEE_MANAGE_ROLES/EMPLOYEE_READ_ROLES exactly.
const EMPLOYEE_MANAGE_ROLETYPE_CODES = ['admin', 'operation-manager-screening', 'operation-manager-diet']
const EMPLOYEE_READ_ROLETYPE_CODES = [...EMPLOYEE_MANAGE_ROLETYPE_CODES, 'field-officer']
const SYSTEM_MANAGE_CODE = 'system:manage'

export function canManageEmployees(roleTypeCode: string | undefined, permissions: string[]): boolean {
  if (permissions.includes(SYSTEM_MANAGE_CODE)) return true
  return !!roleTypeCode && EMPLOYEE_MANAGE_ROLETYPE_CODES.includes(roleTypeCode)
}

export function canReadEmployees(roleTypeCode: string | undefined, permissions: string[]): boolean {
  if (permissions.includes(SYSTEM_MANAGE_CODE)) return true
  return !!roleTypeCode && EMPLOYEE_READ_ROLETYPE_CODES.includes(roleTypeCode)
}

// Mirrors POST /roles's own guard (role.routes.ts) — tenant:admin/tenant:manage.
export function canOnboardNewPerson(roleTypeCode: string | undefined, permissions: string[]): boolean {
  if (permissions.includes(SYSTEM_MANAGE_CODE)) return true
  if (!canManageEmployees(roleTypeCode, permissions)) return false
  return permissions.includes('tenant:admin') || permissions.includes('tenant:manage')
}

// Mirrors GET /roles's own guard (role.routes.ts) — tenant:admin/tenant:manage/role:search —
// AND the separate GET /role-types prerequisite needed to resolve the field-officer RoleType id
// before any role can be searched at all (role-type.routes.ts gates that to tenant:admin/
// tenant:manage only, no role:search path exists). role:search alone can search Roles but can
// never actually reach this flow, since foTypeId would never resolve — so it's not a sufficient
// permission on its own, despite matching GET /roles's own guard in isolation.
export function canLinkExistingAccount(roleTypeCode: string | undefined, permissions: string[]): boolean {
  if (permissions.includes(SYSTEM_MANAGE_CODE)) return true
  if (!canManageEmployees(roleTypeCode, permissions)) return false
  return permissions.includes('tenant:admin') || permissions.includes('tenant:manage')
}
