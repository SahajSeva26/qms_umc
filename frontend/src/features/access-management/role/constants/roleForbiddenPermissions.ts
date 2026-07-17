// Hardcoded mirror of the REAL backend denylist
// (`backend/src/modules/access-management/role/role.service.ts` ->
// `ROLE_FORBIDDEN_PERMISSIONS`):
//
//   const ROLE_FORBIDDEN_PERMISSIONS = [
//     TENANT_PERMISSIONS.ADMIN.code,   // 'tenant:admin'
//     TENANT_PERMISSIONS.MANAGE.code,  // 'tenant:manage'
//     SYSTEM_PERMISSIONS.MANAGE.code,  // 'system:manage'
//   ];
//
// `handlePermissionUpdate` rejects any of these three codes on a Role's
// `permissions` array with a 403, unconditionally — "no bypass, applies even
// to system" per that file's own comment. This is a hard rule, not a
// per-tenant ceiling check, so it is enforced here at the UI layer too: the
// elevated-permissions picker on RoleDetailPage must never even OFFER these
// three codes as choices, rather than relying solely on the backend to 403
// an attempt. Kept in exact sync with that backend source.
export const ROLE_FORBIDDEN_PERMISSIONS: string[] = ['tenant:admin', 'tenant:manage', 'system:manage']

export function isForbiddenRolePermission(code: string): boolean {
  return ROLE_FORBIDDEN_PERMISSIONS.includes(code)
}
