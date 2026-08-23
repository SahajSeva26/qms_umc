// Path constants only — single source of truth for RolesListPage /
// RoleDetailPage's own paths (row-click navigation, back button, create-flow
// redirect). These values match the real routes mounted by
// `@/features/access-management/accessManagement.routes.tsx` (ACCESS_MANAGEMENT_ROUTES.ROLES / ROLE_DETAIL).
// Create now happens via CreateRoleModal (no route of its own) — there is
// no ROLE_NEW here anymore.
export const ROLE_ROUTES = {
  ROLES: '/admin/roles',
  ROLE_DETAIL: '/admin/roles/:id',
}
