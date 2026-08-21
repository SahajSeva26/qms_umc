import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const ANALYTICS_ROUTES = {
  ANALYTICS:           '/analytics',
  ANALYTICS_SALES:     '/analytics/sales',
  ANALYTICS_FO:        '/analytics/fo',
  ANALYTICS_DOCTORS:   '/analytics/doctors',
  ANALYTICS_FINANCIAL: '/analytics/financial',
}

const analyticsPage = lazyRoute(() => import('./pages/AnalyticsPage'))

export const analyticsRoutes: RouteObject[] = [
  { path: ANALYTICS_ROUTES.ANALYTICS,           lazy: analyticsPage },
  { path: ANALYTICS_ROUTES.ANALYTICS_SALES,     lazy: analyticsPage },
  { path: ANALYTICS_ROUTES.ANALYTICS_FO,        lazy: analyticsPage },
  { path: ANALYTICS_ROUTES.ANALYTICS_DOCTORS,   lazy: analyticsPage },
  { path: ANALYTICS_ROUTES.ANALYTICS_FINANCIAL, lazy: analyticsPage },
]
