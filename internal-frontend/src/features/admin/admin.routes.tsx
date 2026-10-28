import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'
import * as AdminPaths from './admin.paths'

// A direct `export const` (not a bare re-export specifier) — see camps.routes.tsx for why.
export const ADMIN_ROUTES = AdminPaths.ADMIN_ROUTES

const USERS_VIEW_PERMISSIONS = ['user:get', 'user:search', 'user:update']
// `:get` is deliberately excluded — the list page only calls search, which needs `:search`/`:manage`.

// HQ/Reminders/Inventory are separate features mounted under /admin/* for
// nav purposes only — same cross-feature-routing pattern as billing.routes.tsx.
const adminPage = lazyRoute(() => import('./pages/AdminPage'))

export const adminRoutes: RouteObject[] = [
  { path: ADMIN_ROUTES.ADMIN,           lazy: adminPage },
  { path: ADMIN_ROUTES.ADMIN_HQ,        lazy: lazyRoute(() => import('@/features/hq/pages/HqPage')) },
  { path: ADMIN_ROUTES.ADMIN_REMINDERS, lazy: lazyRoute(() => import('@/features/reminders/pages/RemindersPage')) },
  {
    // No route-level guard — InventoryManagementPage gates restricted tabs before mounting them.
    path: ADMIN_ROUTES.ADMIN_INVENTORY,
    lazy: lazyRoute(() => import('@/features/inventory/real/pages/InventoryManagementPage')),
  },
  { path: ADMIN_ROUTES.ADMIN_ASSETS,    lazy: adminPage },
  { path: ADMIN_ROUTES.ADMIN_KPI,       lazy: adminPage },
  { path: ADMIN_ROUTES.ADMIN_SETTINGS,  lazy: adminPage },
  {
    path: ADMIN_ROUTES.ADMIN_USERS,
    lazy: lazyRoute(() => import('./pages/UsersPage'), USERS_VIEW_PERMISSIONS),
  },
  {
    path: ADMIN_ROUTES.ADMIN_USER_DETAIL,
    lazy: lazyRoute(() => import('./pages/UserDetailPage'), USERS_VIEW_PERMISSIONS),
  },
  {
    // Temporary system-admin-only phase: the API also admits Ops Manager
    // Screening/Diet, but the UI restricts further until the page is ready for non-system roles.
    path: ADMIN_ROUTES.ADMIN_TESTS,
    lazy: lazyRoute(() => import('@/features/test-master/pages/TestsPage'), ['system:manage']),
  },
]
