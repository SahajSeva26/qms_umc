import type { RouteObject } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'

export const DASHBOARD_ROUTES = {
  DASHBOARD: '/dashboard',
}

export const dashboardRoutes: RouteObject[] = [
  { path: DASHBOARD_ROUTES.DASHBOARD, element: <DashboardPage /> },
]
