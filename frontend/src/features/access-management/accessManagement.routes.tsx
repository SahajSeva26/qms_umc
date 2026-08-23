import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

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
  ROLE_DETAIL:          '/admin/roles/:id',
}

// Named permission-code sets for each entity's lazyRoute permission check,
// pulled out of the JSX below rather than inlined per route — matches each
// backend route's own real AuthorizeMiddleware([...], 'OR') guard exactly
// (see the research this module was built against: tenant/permission-group/
// role-type/role routes.ts, all default OR semantics). Applied to BOTH the
// list route and its detail/new routes — previously only the list routes
// were gated at all; a user could navigate straight to e.g.
// /admin/tenants/:id with zero permission check.
const TENANTS_VIEW_PERMISSIONS = ['tenant:get', 'tenant:search', 'tenant:manage']
// CONFIRMED DRIFT (2026-08-10): this used to be
// ['permission-group:get', 'permission-group:search', 'permission-group:manage']
// — a plausible-looking guess that never matched the real backend. Read
// directly from permissionGroup.routes.ts: GET /:id requires
// permission-group:get; GET / (list, used by both the list AND detail
// pages' own data needs) requires permission-group:search OR tenant:admin
// — permission-group:manage is never checked on ANY route. A caller
// holding only permission-group:manage would pass this nav/route gate,
// land on the page, then 403 on every real API call — the exact dead-link
// class REAL_GATED_NAV_ITEMS/RequirePermission exist to prevent. Fixed to
// the real union of every code that lets the page actually load.
const PERMISSION_GROUPS_VIEW_PERMISSIONS = ['permission-group:get', 'permission-group:search', 'tenant:admin']
// CONFIRMED DRIFT (2026-08-10): this used to be
// ['role-type:get', 'role-type:search', 'role-type:manage'] — role-type:*
// codes that sound right but are never checked by roleType.routes.ts at
// all. Every Role Type route (GET/:id, GET/, POST/, PUT/:id) is actually
// gated purely on tenant:manage/tenant:admin — role-type:manage etc. are
// currently dead codes on the backend. Fixed to match the real guard.
const ROLE_TYPES_VIEW_PERMISSIONS = ['tenant:manage', 'tenant:admin']
// CONFIRMED DRIFT (2026-08-10): this used to be
// ['role:get', 'role:search', 'role:manage'] — role:manage is never
// checked by role.routes.ts on any route. Real guards: GET /:id requires
// tenant:admin/tenant:manage/role:get; GET / requires
// tenant:admin/tenant:manage/role:search. Fixed to the real union.
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
  // Stale bookmark/link to the old full-page create flow (removed — create
  // is now CreateRoleModal, opened from the list) — send it back to the
  // list instead of falling through to ROLE_DETAIL's :id route, which would
  // try (and fail) to load a role literally named "new".
  {
    path: '/admin/roles/new',
    element: <Navigate to={ACCESS_MANAGEMENT_ROUTES.ROLES} replace />,
  },
  {
    path: ACCESS_MANAGEMENT_ROUTES.ROLE_DETAIL,
    lazy: lazyRoute(() => import('@/features/access-management/role/pages/RoleDetailPage'), ROLES_VIEW_PERMISSIONS),
  },
]
