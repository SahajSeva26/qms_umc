import type { RouteObject } from 'react-router-dom'
import AnalyticsPage from './pages/AnalyticsPage'

export const ANALYTICS_ROUTES = {
  ANALYTICS:           '/analytics',
  ANALYTICS_SALES:     '/analytics/sales',
  ANALYTICS_FO:        '/analytics/fo',
  ANALYTICS_DOCTORS:   '/analytics/doctors',
  ANALYTICS_FINANCIAL: '/analytics/financial',
}

export const analyticsRoutes: RouteObject[] = [
  { path: ANALYTICS_ROUTES.ANALYTICS,           element: <AnalyticsPage /> },
  { path: ANALYTICS_ROUTES.ANALYTICS_SALES,     element: <AnalyticsPage /> },
  { path: ANALYTICS_ROUTES.ANALYTICS_FO,        element: <AnalyticsPage /> },
  { path: ANALYTICS_ROUTES.ANALYTICS_DOCTORS,   element: <AnalyticsPage /> },
  { path: ANALYTICS_ROUTES.ANALYTICS_FINANCIAL, element: <AnalyticsPage /> },
]
