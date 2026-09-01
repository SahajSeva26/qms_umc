import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const ADMIN_ROUTES = {
  ADMIN:              '/admin',
  ADMIN_HQ:           '/admin/hq',
  ADMIN_REMINDERS:    '/admin/reminders',
  ADMIN_INVENTORY:    '/admin/inventory',
  ADMIN_INVENTORY_MASTERS: '/admin/inventory-masters',
  ADMIN_INVENTORY_ITEMS: '/admin/inventory-items',
  ADMIN_INVENTORY_OPERATIONS: '/admin/inventory-operations',
  ADMIN_ASSETS:       '/admin/assets',
  ADMIN_KPI:          '/admin/kpi',
  ADMIN_SETTINGS:     '/admin/settings',
  ADMIN_USERS:        '/admin/users',
  ADMIN_USER_DETAIL:  '/admin/users/:id',
  ADMIN_TESTS:        '/admin/tests',
}

// Matches GET/PUT /users's real backend guards exactly (user.routes.ts).
const USERS_VIEW_PERMISSIONS = ['user:get', 'user:search', 'user:update']

// HQ/Reminders/Inventory are separate features mounted under /admin/* for
// nav purposes only — same cross-feature-routing pattern as billing.routes.tsx.
const adminPage = lazyRoute(() => import('./pages/AdminPage'))

export const adminRoutes: RouteObject[] = [
  { path: ADMIN_ROUTES.ADMIN,           lazy: adminPage },
  { path: ADMIN_ROUTES.ADMIN_HQ,        lazy: lazyRoute(() => import('@/features/hq/pages/HqPage')) },
  { path: ADMIN_ROUTES.ADMIN_REMINDERS, lazy: lazyRoute(() => import('@/features/reminders/pages/RemindersPage')) },
  { path: ADMIN_ROUTES.ADMIN_INVENTORY, lazy: lazyRoute(() => import('@/features/inventory/pages/InventoryPage')) },
  { path: ADMIN_ROUTES.ADMIN_INVENTORY_MASTERS, lazy: lazyRoute(() => import('@/features/inventory/real/pages/InventoryMastersPage')) },
  { path: ADMIN_ROUTES.ADMIN_INVENTORY_ITEMS, lazy: lazyRoute(() => import('@/features/inventory/real/pages/InventoryItemsPage')) },
  { path: ADMIN_ROUTES.ADMIN_INVENTORY_OPERATIONS, lazy: lazyRoute(() => import('@/features/inventory/real/pages/InventoryOperationsPage')) },
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
    // Temporary system-admin-only phase: the backend permission-gates
    // GET/POST/PUT /test-masters via test-master:search/get/manage, which
    // OPERATION_MANAGER_SCREENING/DIET also hold — the API would let them in.
    // This route guard intentionally restricts the UI further, to system:manage
    // only, until the Test Master admin page is ready for non-system roles.
    path: ADMIN_ROUTES.ADMIN_TESTS,
    lazy: lazyRoute(() => import('@/features/test-master/pages/TestsPage'), ['system:manage']),
  },
]
