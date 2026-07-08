import type { RouteObject } from 'react-router-dom'
import AdminPage from './pages/AdminPage'

export const ADMIN_ROUTES = {
  ADMIN:            '/admin',
  ADMIN_HQ:         '/admin/hq',
  ADMIN_REMINDERS:  '/admin/reminders',
  ADMIN_INVENTORY:  '/admin/inventory',
  ADMIN_ASSETS:     '/admin/assets',
  ADMIN_KPI:        '/admin/kpi',
  ADMIN_SETTINGS:   '/admin/settings',
}

export const adminRoutes: RouteObject[] = [
  { path: ADMIN_ROUTES.ADMIN,           element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_HQ,        element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_REMINDERS, element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_INVENTORY, element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_ASSETS,    element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_KPI,       element: <AdminPage /> },
  { path: ADMIN_ROUTES.ADMIN_SETTINGS,  element: <AdminPage /> },
]
