import type { RouteObject } from 'react-router-dom'
import RequirePermission from '@/components/layouts/RequirePermission'
import AdminPage from './pages/AdminPage'
import UsersPage from './pages/UsersPage'
import UserDetailPage from './pages/UserDetailPage'
import HqPage from '@/features/hq/pages/HqPage'
import RemindersPage from '@/features/reminders/pages/RemindersPage'
import InventoryPage from '@/features/inventory/pages/InventoryPage'

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

export const adminRoutes: RouteObject[] = [
  { path: ADMIN_ROUTES.ADMIN,           element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_HQ,        element: <HqPage /> },
  { path: ADMIN_ROUTES.ADMIN_REMINDERS, element: <RemindersPage /> },
  { path: ADMIN_ROUTES.ADMIN_INVENTORY, element: <InventoryPage /> },
  { path: ADMIN_ROUTES.ADMIN_ASSETS,    element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_KPI,       element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_SETTINGS,  element: <AdminPage /> },
  {
    path: ADMIN_ROUTES.ADMIN_USERS,
    element: (
      <RequirePermission anyOf={USERS_VIEW_PERMISSIONS}>
        <UsersPage />
      </RequirePermission>
    ),
  },
  {
    path: ADMIN_ROUTES.ADMIN_USER_DETAIL,
    element: (
      <RequirePermission anyOf={USERS_VIEW_PERMISSIONS}>
        <UserDetailPage />
      </RequirePermission>
    ),
  },
]
