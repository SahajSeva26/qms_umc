// Path constants only — single source of truth for PermissionGroupsListPage /
// PermissionGroupDetailPage's own paths (row-click navigation, back button).
// These values match the real routes mounted by
// `@/features/pbac/pbac.routes.tsx` (PBAC_ROUTES.PERMISSION_GROUPS /
// PERMISSION_GROUP_DETAIL).
export const PERMISSION_GROUP_ROUTES = {
  PERMISSION_GROUPS: '/admin/permission-groups',
  PERMISSION_GROUP_DETAIL: '/admin/permission-groups/:id',
}
