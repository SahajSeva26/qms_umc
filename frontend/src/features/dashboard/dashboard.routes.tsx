import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const DASHBOARD_ROUTES = {
  DASHBOARD: '/dashboard',
}

export const dashboardRoutes: RouteObject[] = [
  { path: DASHBOARD_ROUTES.DASHBOARD, lazy: lazyRoute(() => import('./pages/DashboardPage')) },
]
