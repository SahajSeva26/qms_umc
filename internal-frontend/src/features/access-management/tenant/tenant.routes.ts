// Path constants only — single source of truth for TenantsListPage /
// TenantDetailPage's own paths (row-click navigation, back button). These
// values match the real routes mounted by `@/features/access-management/accessManagement.routes.tsx`
// (ACCESS_MANAGEMENT_ROUTES.TENANTS / TENANT_DETAIL) — kept as separate literals here
// (not re-exported from accessManagement.routes.tsx) so this subfeature doesn't need to
// import from its sibling routes file.
export const TENANT_ROUTES = {
  TENANTS: '/admin/tenants',
  TENANT_DETAIL: '/admin/tenants/:id',
}
