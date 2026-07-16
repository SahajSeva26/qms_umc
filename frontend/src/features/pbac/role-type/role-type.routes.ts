// Path constants only — single source of truth for RoleTypesListPage /
// RoleTypeDetailPage's own paths (row-click navigation, back button,
// create-flow redirect). These values match the real routes mounted by
// `@/features/pbac/pbac.routes.tsx` (PBAC_ROUTES.ROLE_TYPES /
// ROLE_TYPE_DETAIL / ROLE_TYPE_NEW).
export const ROLE_TYPE_ROUTES = {
  ROLE_TYPES: '/admin/role-types',
  ROLE_TYPE_DETAIL: '/admin/role-types/:id',
  ROLE_TYPE_NEW: '/admin/role-types/new',
}
