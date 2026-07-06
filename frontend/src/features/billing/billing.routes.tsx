import type { RouteObject } from 'react-router-dom'
import BillingPage from './pages/BillingPage'

export const billingRoutes: RouteObject[] = [
  { path: '/billing', element: <BillingPage /> },
]
