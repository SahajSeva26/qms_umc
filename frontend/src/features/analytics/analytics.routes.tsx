import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'
import * as AnalyticsPaths from './analytics.paths'

// A direct `export const` (not a bare re-export specifier) — see camps.routes.tsx for why.
export const ANALYTICS_ROUTES = AnalyticsPaths.ANALYTICS_ROUTES

const analyticsPage = lazyRoute(() => import('./pages/AnalyticsPage'))
// fo/sales/financial are real-data-only — routed to their own pages so they never run the legacy
// mock-driven shell /analytics/doctors still uses.
const foAnalyticsPage = lazyRoute(() => import('./pages/FoAnalyticsPage'))
const salesAnalyticsPage = lazyRoute(() => import('./pages/SalesAnalyticsPage'))
const financialAnalyticsPage = lazyRoute(() => import('./pages/FinancialAnalyticsPage'))

export const analyticsRoutes: RouteObject[] = [
  { path: ANALYTICS_ROUTES.ANALYTICS,           lazy: analyticsPage },
  { path: ANALYTICS_ROUTES.ANALYTICS_SALES,     lazy: salesAnalyticsPage },
  { path: ANALYTICS_ROUTES.ANALYTICS_FO,        lazy: foAnalyticsPage },
  { path: ANALYTICS_ROUTES.ANALYTICS_DOCTORS,   lazy: analyticsPage },
  { path: ANALYTICS_ROUTES.ANALYTICS_FINANCIAL, lazy: financialAnalyticsPage },
]
