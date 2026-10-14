import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'
import * as AnalyticsPaths from './analytics.paths'

// A direct `export const` (not a bare re-export specifier) — see camps.routes.tsx for why.
export const ANALYTICS_ROUTES = AnalyticsPaths.ANALYTICS_ROUTES

const analyticsPage = lazyRoute(() => import('./pages/AnalyticsPage'))

export const analyticsRoutes: RouteObject[] = [
  { path: ANALYTICS_ROUTES.ANALYTICS,           lazy: analyticsPage },
  { path: ANALYTICS_ROUTES.ANALYTICS_SALES,     lazy: analyticsPage },
  { path: ANALYTICS_ROUTES.ANALYTICS_FO,        lazy: analyticsPage },
  { path: ANALYTICS_ROUTES.ANALYTICS_DOCTORS,   lazy: analyticsPage },
  { path: ANALYTICS_ROUTES.ANALYTICS_FINANCIAL, lazy: analyticsPage },
]
