import type { RouteObject } from 'react-router-dom'
import AccessPermissionGate from '@/features/access-management/components/AccessPermissionGate'
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

export const accessManagementRoutes: RouteObject[] = [
  // Tenants
  {
    path: ACCESS_MANAGEMENT_ROUTES.TENANTS,
    element: (
      <AccessPermissionGate anyOf={['tenant:get', 'tenant:search', 'tenant:manage']}>
        <TenantsListPage />
      </AccessPermissionGate>
    ),
  },
  { path: ACCESS_MANAGEMENT_ROUTES.TENANT_DETAIL, element: <TenantDetailPage /> },

  // Permission Groups
  {
    path: ACCESS_MANAGEMENT_ROUTES.PERMISSION_GROUPS,
    element: (
      <AccessPermissionGate anyOf={['permission-group:get', 'permission-group:search', 'permission-group:manage']}>
        <PermissionGroupsListPage />
      </AccessPermissionGate>
    ),
  },
  { path: ACCESS_MANAGEMENT_ROUTES.PERMISSION_GROUP_DETAIL, element: <PermissionGroupDetailPage /> },

  // Role Types
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLE_TYPES,
    element: (
      <AccessPermissionGate anyOf={['role-type:get', 'role-type:search', 'role-type:manage']}>
        <RoleTypesListPage />
      </AccessPermissionGate>
    ),
  },
  { path: ACCESS_MANAGEMENT_ROUTES.ROLE_TYPE_NEW,    element: <RoleTypeDetailPage /> },
  { path: ACCESS_MANAGEMENT_ROUTES.ROLE_TYPE_DETAIL, element: <RoleTypeDetailPage /> },

  // Roles
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLES,
    element: (
      <AccessPermissionGate anyOf={['role:get', 'role:search', 'role:manage']}>
        <RolesListPage />
      </AccessPermissionGate>
    ),
  },
  { path: ACCESS_MANAGEMENT_ROUTES.ROLE_NEW,    element: <RoleDetailPage /> },
  { path: ACCESS_MANAGEMENT_ROUTES.ROLE_DETAIL, element: <RoleDetailPage /> },
]
