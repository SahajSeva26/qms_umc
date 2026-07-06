import type { RouteObject } from 'react-router-dom'
import AnalyticsPage from './pages/AnalyticsPage'

export const analyticsRoutes: RouteObject[] = [
  { path: '/analytics', element: <AnalyticsPage /> },
]
