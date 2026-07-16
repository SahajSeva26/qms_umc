import type { RouteObject } from 'react-router-dom'
import PbacPermissionGate from '@/features/pbac/components/PbacPermissionGate'
import TenantsListPage from '@/features/pbac/tenant/pages/TenantsListPage'
import TenantDetailPage from '@/features/pbac/tenant/pages/TenantDetailPage'
import PermissionGroupsListPage from '@/features/pbac/permission-group/pages/PermissionGroupsListPage'
import PermissionGroupDetailPage from '@/features/pbac/permission-group/pages/PermissionGroupDetailPage'
import RoleTypesListPage from '@/features/pbac/role-type/pages/RoleTypesListPage'
import RoleTypeDetailPage from '@/features/pbac/role-type/pages/RoleTypeDetailPage'
import RolesListPage from '@/features/pbac/role/pages/RolesListPage'
import RoleDetailPage from '@/features/pbac/role/pages/RoleDetailPage'

// This feature owns its own routes file per CLAUDE.md's routing convention
// ("Feature routes … Export a `routes` array … Define all paths for that
// feature"). Previously these pages were imported directly into
// `@/features/admin/admin.routes.tsx` and mounted there, which was a
// cross-feature import violation (admin reaching into pbac/**) — removing
// `features/admin/` would have silently unregistered these routes, and
// removing `features/pbac/` would have broken admin's build. Paths are kept
// at `/admin/*` (unchanged from before) purely so existing nav links /
// bookmarks keep working — only the *ownership* of the route definitions
// moved, not the URLs themselves.
export const PBAC_ROUTES = {
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

export const pbacRoutes: RouteObject[] = [
  // Tenants
  {
    path: PBAC_ROUTES.TENANTS,
    element: (
      <PbacPermissionGate anyOf={['tenant:get', 'tenant:search', 'tenant:manage']}>
        <TenantsListPage />
      </PbacPermissionGate>
    ),
  },
  { path: PBAC_ROUTES.TENANT_DETAIL, element: <TenantDetailPage /> },

  // Permission Groups
  {
    path: PBAC_ROUTES.PERMISSION_GROUPS,
    element: (
      <PbacPermissionGate anyOf={['permission-group:get', 'permission-group:search', 'permission-group:manage']}>
        <PermissionGroupsListPage />
      </PbacPermissionGate>
    ),
  },
  { path: PBAC_ROUTES.PERMISSION_GROUP_DETAIL, element: <PermissionGroupDetailPage /> },

  // Role Types
  {
    path: PBAC_ROUTES.ROLE_TYPES,
    element: (
      <PbacPermissionGate anyOf={['role-type:get', 'role-type:search', 'role-type:manage']}>
        <RoleTypesListPage />
      </PbacPermissionGate>
    ),
  },
  { path: PBAC_ROUTES.ROLE_TYPE_NEW,    element: <RoleTypeDetailPage /> },
  { path: PBAC_ROUTES.ROLE_TYPE_DETAIL, element: <RoleTypeDetailPage /> },

  // Roles
  {
    path: PBAC_ROUTES.ROLES,
    element: (
      <PbacPermissionGate anyOf={['role:get', 'role:search', 'role:manage']}>
        <RolesListPage />
      </PbacPermissionGate>
    ),
  },
  { path: PBAC_ROUTES.ROLE_NEW,    element: <RoleDetailPage /> },
  { path: PBAC_ROUTES.ROLE_DETAIL, element: <RoleDetailPage /> },
]
