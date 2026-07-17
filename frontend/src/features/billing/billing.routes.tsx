import type { RouteObject } from 'react-router-dom'
import BillingPage from './pages/BillingPage'

export const BILLING_ROUTES = {
  BILLING:          '/billing',
  BILLING_DIETITIAN: '/billing/dietitian',
  BILLING_CRM:      '/billing/crm',
  BILLING_CFO:      '/billing/cfo',
}

export const billingRoutes: RouteObject[] = [
  { path: BILLING_ROUTES.BILLING,           element: <BillingPage /> },
  { path: BILLING_ROUTES.BILLING_DIETITIAN, element: <BillingPage /> },
  { path: BILLING_ROUTES.BILLING_CRM,       element: <BillingPage /> },
  { path: BILLING_ROUTES.BILLING_CFO,       element: <BillingPage /> },
]
