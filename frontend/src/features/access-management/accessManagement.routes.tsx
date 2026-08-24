import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

// Paths stay under `/admin/*` so existing nav links/bookmarks keep working.
export const ACCESS_MANAGEMENT_ROUTES = {
  TENANTS:              '/admin/tenants',
  TENANT_DETAIL:        '/admin/tenants/:id',
  PERMISSION_GROUPS:       '/admin/permission-groups',
  PERMISSION_GROUP_DETAIL: '/admin/permission-groups/:id',
  ROLE_TYPES:           '/admin/role-types',
  ROLE_TYPE_NEW:        '/admin/role-types/new',
  ROLE_TYPE_DETAIL:     '/admin/role-types/:id',
  ROLES:                '/admin/roles',
  ROLE_DETAIL:          '/admin/roles/:id',
}

// Each array unions its list+detail backend guards, not one shared guard —
// list-only (search) and detail-only (get) permissions genuinely differ on
// the backend, so a search-only caller can still reach a detail page that
// then 403s on its own fetch (tenant/permission-group/role all do this).
const TENANTS_VIEW_PERMISSIONS = ['tenant:get', 'tenant:search', 'tenant:manage']
const PERMISSION_GROUPS_VIEW_PERMISSIONS = ['permission-group:get', 'permission-group:search', 'tenant:admin']
const ROLE_TYPES_VIEW_PERMISSIONS = ['tenant:manage', 'tenant:admin']
const ROLES_VIEW_PERMISSIONS = ['tenant:admin', 'tenant:manage', 'role:get', 'role:search']

export const accessManagementRoutes: RouteObject[] = [
  // Tenants
  {
    path: ACCESS_MANAGEMENT_ROUTES.TENANTS,
    lazy: lazyRoute(() => import('@/features/access-management/tenant/pages/TenantsListPage'), TENANTS_VIEW_PERMISSIONS),
  },
  {
    path: ACCESS_MANAGEMENT_ROUTES.TENANT_DETAIL,
    lazy: lazyRoute(() => import('@/features/access-management/tenant/pages/TenantDetailPage'), TENANTS_VIEW_PERMISSIONS),
  },

  // Permission Groups
  {
    path: ACCESS_MANAGEMENT_ROUTES.PERMISSION_GROUPS,
    lazy: lazyRoute(() => import('@/features/access-management/permission-group/pages/PermissionGroupsListPage'), PERMISSION_GROUPS_VIEW_PERMISSIONS),
  },
  {
    path: ACCESS_MANAGEMENT_ROUTES.PERMISSION_GROUP_DETAIL,
    lazy: lazyRoute(() => import('@/features/access-management/permission-group/pages/PermissionGroupDetailPage'), PERMISSION_GROUPS_VIEW_PERMISSIONS),
  },

  // Role Types
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLE_TYPES,
    lazy: lazyRoute(() => import('@/features/access-management/role-type/pages/RoleTypesListPage'), ROLE_TYPES_VIEW_PERMISSIONS),
  },
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLE_TYPE_NEW,
    lazy: lazyRoute(() => import('@/features/access-management/role-type/pages/RoleTypeDetailPage'), ROLE_TYPES_VIEW_PERMISSIONS),
  },
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLE_TYPE_DETAIL,
    lazy: lazyRoute(() => import('@/features/access-management/role-type/pages/RoleTypeDetailPage'), ROLE_TYPES_VIEW_PERMISSIONS),
  },

  // Roles
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLES,
    lazy: lazyRoute(() => import('@/features/access-management/role/pages/RolesListPage'), ROLES_VIEW_PERMISSIONS),
  },
  // Stale bookmark for the removed full-page create flow — redirect instead
  // of falling through to ROLE_DETAIL's :id route with id="new".
  {
    path: '/admin/roles/new',
    element: <Navigate to={ACCESS_MANAGEMENT_ROUTES.ROLES} replace />,
  },
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLE_DETAIL,
    lazy: lazyRoute(() => import('@/features/access-management/role/pages/RoleDetailPage'), ROLES_VIEW_PERMISSIONS),
  },
]
