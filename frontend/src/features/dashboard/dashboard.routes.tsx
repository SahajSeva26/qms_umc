import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'
import * as DashboardPaths from './dashboard.paths'

// A direct `export const` (not a bare re-export specifier) — see camps.routes.tsx for why.
export const DASHBOARD_ROUTES = DashboardPaths.DASHBOARD_ROUTES

export const dashboardRoutes: RouteObject[] = [
  { path: DASHBOARD_ROUTES.DASHBOARD, lazy: lazyRoute(() => import('./pages/DashboardPage')) },
]
