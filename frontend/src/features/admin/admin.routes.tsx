import type { RouteObject } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import UsersPage from './pages/UsersPage'
import UserDetailPage from './pages/UserDetailPage'
import HqPage from '@/features/hq/pages/HqPage'
import RemindersPage from '@/features/reminders/pages/RemindersPage'

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

export const adminRoutes: RouteObject[] = [
  { path: ADMIN_ROUTES.ADMIN,           element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_HQ,        element: <HqPage /> },
  { path: ADMIN_ROUTES.ADMIN_REMINDERS, element: <RemindersPage /> },
  { path: ADMIN_ROUTES.ADMIN_INVENTORY, element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_ASSETS,    element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_KPI,       element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_SETTINGS,  element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_USERS,       element: <UsersPage /> },
  { path: ADMIN_ROUTES.ADMIN_USER_DETAIL, element: <UserDetailPage /> },
]
