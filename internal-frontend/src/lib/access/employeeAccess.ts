// Mirrors backend employee.routes.ts's EMPLOYEE_MANAGE_ROLES/EMPLOYEE_READ_ROLES exactly.
const EMPLOYEE_MANAGE_ROLETYPE_CODES = ['admin', 'operation-manager-screening', 'operation-manager-diet']
const EMPLOYEE_READ_ROLETYPE_CODES = [...EMPLOYEE_MANAGE_ROLETYPE_CODES, 'field-officer', 'dietitian']
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

// role:search alone isn't sufficient: GET /role-types (needed first, to resolve the FO RoleType
// id) is gated to tenant:admin/tenant:manage only, so a role:search-only actor can never reach this flow.
export function canLinkExistingAccount(roleTypeCode: string | undefined, permissions: string[]): boolean {
  if (permissions.includes(SYSTEM_MANAGE_CODE)) return true
  if (!canManageEmployees(roleTypeCode, permissions)) return false
  return permissions.includes('tenant:admin') || permissions.includes('tenant:manage')
}
