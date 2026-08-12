import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const ADMIN_ROUTES = {
  ADMIN:              '/admin',
  ADMIN_HQ:           '/admin/hq',
  ADMIN_REMINDERS:    '/admin/reminders',
  ADMIN_INVENTORY:    '/admin/inventory',
  ADMIN_ASSETS:       '/admin/assets',
  ADMIN_KPI:          '/admin/kpi',
  ADMIN_SETTINGS:     '/admin/settings',
  ADMIN_USERS:        '/admin/users',
  ADMIN_USER_DETAIL:  '/admin/users/:id',
}

// Matches GET /users's (user:search) and GET/PUT /users/:id's (user:get /
// user:update) real backend guards exactly (user.routes.ts) — UsersPage.tsx
// calls searchUsers, UserDetailPage.tsx calls both get and update. No
// frontend route guard existed before this; the page itself was reachable
// by URL regardless of permission, relying solely on the backend's own
// per-request 403 on the underlying API calls.
const USERS_VIEW_PERMISSIONS = ['user:get', 'user:search', 'user:update']

// HQ, Reminders and Inventory are separate features (features/hq,
// features/reminders, features/inventory) mounted under /admin/* for nav
// purposes only — same cross-feature-routing pattern billing.routes.tsx uses
// for Diet's DietitianPaymentPage. None have their own permission codes
// today (no RequirePermission wrapper existed before this change either) —
// lazy-loading doesn't change that; it only stops their (individually
// large — Inventory and HQ in particular) chunks from shipping to every
// authenticated user regardless of whether they ever open /admin.
const adminPage = lazyRoute(() => import('./pages/AdminPage'))

export const adminRoutes: RouteObject[] = [
  { path: ADMIN_ROUTES.ADMIN,           lazy: adminPage },
  { path: ADMIN_ROUTES.ADMIN_HQ,        lazy: lazyRoute(() => import('@/features/hq/pages/HqPage')) },
  { path: ADMIN_ROUTES.ADMIN_REMINDERS, lazy: lazyRoute(() => import('@/features/reminders/pages/RemindersPage')) },
  { path: ADMIN_ROUTES.ADMIN_INVENTORY, lazy: lazyRoute(() => import('@/features/inventory/pages/InventoryPage')) },
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
]
