import type { RouteObject } from 'react-router-dom'
import BillingPage from './pages/BillingPage'
// Dietitian Payment is a Diet Camp Coordination screen (payment workbench
// over Diet camps/dietitians) routed under /billing/dietitian for nav
// purposes only — its page component lives in features/diet/ alongside the
// other 2 Dietitians-section screens, not in this (otherwise still-stub)
// billing feature.
import DietitianPaymentPage from '@/features/diet/pages/DietitianPaymentPage'

export const BILLING_ROUTES = {
  BILLING:          '/billing',
  BILLING_DIETITIAN: '/billing/dietitian',
  BILLING_CRM:      '/billing/crm',
  BILLING_CFO:      '/billing/cfo',
}

export const billingRoutes: RouteObject[] = [
  { path: BILLING_ROUTES.BILLING,           element: <BillingPage /> },
  { path: BILLING_ROUTES.BILLING_DIETITIAN, element: <DietitianPaymentPage /> },
  { path: BILLING_ROUTES.BILLING_CRM,       element: <BillingPage /> },
  { path: BILLING_ROUTES.BILLING_CFO,       element: <BillingPage /> },
]
