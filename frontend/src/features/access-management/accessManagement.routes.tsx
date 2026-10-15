import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'
import * as AccessManagementPaths from './accessManagement.paths'

// A direct `export const` (not a bare re-export specifier) — see camps.routes.tsx for why.
export const ACCESS_MANAGEMENT_ROUTES = AccessManagementPaths.ACCESS_MANAGEMENT_ROUTES

// Each array unions its list+detail backend guards, not one shared guard — a search-only
// caller can still reach a detail page that then 403s on its own fetch.
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

  // Employees — gated by role TYPE (RoleGuard), not permission codes, so no `anyOf` here;
  // RequireEmployeeAccess (rendered inside each page) is the real guard.
  {
    path: ACCESS_MANAGEMENT_ROUTES.EMPLOYEES,
    lazy: lazyRoute(() => import('@/features/access-management/employee/pages/EmployeesListPage')),
  },
  {
    path: ACCESS_MANAGEMENT_ROUTES.EMPLOYEE_DETAIL,
    lazy: lazyRoute(() => import('@/features/access-management/employee/pages/EmployeeDetailPage')),
  },
]
