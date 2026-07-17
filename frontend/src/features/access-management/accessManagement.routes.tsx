import type { RouteObject } from 'react-router-dom'
import RequirePermission from '@/components/layouts/RequirePermission'
import TenantsListPage from '@/features/access-management/tenant/pages/TenantsListPage'
import TenantDetailPage from '@/features/access-management/tenant/pages/TenantDetailPage'
import PermissionGroupsListPage from '@/features/access-management/permission-group/pages/PermissionGroupsListPage'
import PermissionGroupDetailPage from '@/features/access-management/permission-group/pages/PermissionGroupDetailPage'
import RoleTypesListPage from '@/features/access-management/role-type/pages/RoleTypesListPage'
import RoleTypeDetailPage from '@/features/access-management/role-type/pages/RoleTypeDetailPage'
import RolesListPage from '@/features/access-management/role/pages/RolesListPage'
import RoleDetailPage from '@/features/access-management/role/pages/RoleDetailPage'

// This feature owns its own routes file per CLAUDE.md's routing convention
// ("Feature routes … Export a `routes` array … Define all paths for that
// feature"). Previously these pages were imported directly into
// `@/features/admin/admin.routes.tsx` and mounted there, which was a
// cross-feature import violation (admin reaching into access-management/**) —
// removing `features/admin/` would have silently unregistered these routes, and
// removing `features/access-management/` would have broken admin's build. Paths are kept
// at `/admin/*` (unchanged from before) purely so existing nav links /
// bookmarks keep working — only the *ownership* of the route definitions
// moved, not the URLs themselves.
export const ACCESS_MANAGEMENT_ROUTES = {
  TENANTS:              '/admin/tenants',
  TENANT_DETAIL:        '/admin/tenants/:id',
  PERMISSION_GROUPS:       '/admin/permission-groups',
  PERMISSION_GROUP_DETAIL: '/admin/permission-groups/:id',
  ROLE_TYPES:           '/admin/role-types',
  ROLE_TYPE_NEW:        '/admin/role-types/new',
  ROLE_TYPE_DETAIL:     '/admin/role-types/:id',
  ROLES:                '/admin/roles',
  ROLE_NEW:             '/admin/roles/new',
  ROLE_DETAIL:          '/admin/roles/:id',
}

// Named permission-code sets for each entity's <RequirePermission> route
// guard, pulled out of the JSX below rather than inlined per route —
// matches each backend route's own real AuthorizeMiddleware([...], 'OR')
// guard exactly (see the research this module was built against:
// tenant/permission-group/role-type/role routes.ts, all default OR
// semantics). Applied to BOTH the list route and its detail/new routes —
// previously only the list routes were gated at all; a user could
// navigate straight to e.g. /admin/tenants/:id with zero permission check.
const TENANTS_VIEW_PERMISSIONS = ['tenant:get', 'tenant:search', 'tenant:manage']
const PERMISSION_GROUPS_VIEW_PERMISSIONS = ['permission-group:get', 'permission-group:search', 'permission-group:manage']
const ROLE_TYPES_VIEW_PERMISSIONS = ['role-type:get', 'role-type:search', 'role-type:manage']
const ROLES_VIEW_PERMISSIONS = ['role:get', 'role:search', 'role:manage']

export const accessManagementRoutes: RouteObject[] = [
  // Tenants
  {
    path: ACCESS_MANAGEMENT_ROUTES.TENANTS,
    element: (
      <RequirePermission anyOf={TENANTS_VIEW_PERMISSIONS}>
        <TenantsListPage />
      </RequirePermission>
    ),
  },
  {
    path: ACCESS_MANAGEMENT_ROUTES.TENANT_DETAIL,
    element: (
      <RequirePermission anyOf={TENANTS_VIEW_PERMISSIONS}>
        <TenantDetailPage />
      </RequirePermission>
    ),
  },

  // Permission Groups
  {
    path: ACCESS_MANAGEMENT_ROUTES.PERMISSION_GROUPS,
    element: (
      <RequirePermission anyOf={PERMISSION_GROUPS_VIEW_PERMISSIONS}>
        <PermissionGroupsListPage />
      </RequirePermission>
    ),
  },
  {
    path: ACCESS_MANAGEMENT_ROUTES.PERMISSION_GROUP_DETAIL,
    element: (
      <RequirePermission anyOf={PERMISSION_GROUPS_VIEW_PERMISSIONS}>
        <PermissionGroupDetailPage />
      </RequirePermission>
    ),
  },

  // Role Types
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLE_TYPES,
    element: (
      <RequirePermission anyOf={ROLE_TYPES_VIEW_PERMISSIONS}>
        <RoleTypesListPage />
      </RequirePermission>
    ),
  },
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLE_TYPE_NEW,
    element: (
      <RequirePermission anyOf={ROLE_TYPES_VIEW_PERMISSIONS}>
        <RoleTypeDetailPage />
      </RequirePermission>
    ),
  },
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLE_TYPE_DETAIL,
    element: (
      <RequirePermission anyOf={ROLE_TYPES_VIEW_PERMISSIONS}>
        <RoleTypeDetailPage />
      </RequirePermission>
    ),
  },

  // Roles
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLES,
    element: (
      <RequirePermission anyOf={ROLES_VIEW_PERMISSIONS}>
        <RolesListPage />
      </RequirePermission>
    ),
  },
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLE_NEW,
    element: (
      <RequirePermission anyOf={ROLES_VIEW_PERMISSIONS}>
        <RoleDetailPage />
      </RequirePermission>
    ),
  },
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLE_DETAIL,
    element: (
      <RequirePermission anyOf={ROLES_VIEW_PERMISSIONS}>
        <RoleDetailPage />
      </RequirePermission>
    ),
  },
]
