// Path constants only — single source of truth for RolesListPage /
// RoleDetailPage's own paths (row-click navigation, back button, create-flow
// redirect). These values match the real routes mounted by
// `@/features/pbac/pbac.routes.tsx` (PBAC_ROUTES.ROLES / ROLE_DETAIL /
// ROLE_NEW).
export const ROLE_ROUTES = {
  ROLES: '/admin/roles',
  ROLE_DETAIL: '/admin/roles/:id',
  ROLE_NEW: '/admin/roles/new',
}
