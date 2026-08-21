import type { RouteObject } from 'react-router-dom'
import BillingPage from './pages/BillingPage'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const BILLING_ROUTES = {
  BILLING:          '/billing',
  BILLING_DIETITIAN: '/billing/dietitian',
  BILLING_CRM:      '/billing/crm',
  BILLING_CFO:      '/billing/cfo',
}

// BILLING/BILLING_CFO are still stubs (no dedicated backend module yet, see
// root CLAUDE.md's module status table) — kept eager since BillingPage is
// small and there's no chunk worth splitting out. Dietitian Payment is a
// Diet Camp Coordination screen (payment workbench over Diet camps/
// dietitians) routed under /billing/dietitian for nav purposes only — its
// page component lives in features/diet/, not in this billing feature.
//
// BILLING_CRM is now real, backend-wired CRM Invoicing (finance/invoice +
// finance/invoiceLineItem) — gated on `system:manage` ONLY, temporarily.
// This is deliberately NOT the real invoice permission array
// (['invoice:search', 'invoice:manage', 'tenant:manage']): Sales Head
// already holds invoice:manage (from a separate hotfix) but has zero
// Project/Camp read permissions, so it would 403 inside this page's
// pickers. Real role-scoping is deferred — see the plan file / memory
// for full context. Revisit this gate once that's designed.
export const billingRoutes: RouteObject[] = [
  { path: BILLING_ROUTES.BILLING,           element: <BillingPage /> },
  { path: BILLING_ROUTES.BILLING_DIETITIAN, lazy: lazyRoute(() => import('@/features/diet/pages/DietitianPaymentPage')) },
  { path: BILLING_ROUTES.BILLING_CRM,       lazy: lazyRoute(() => import('./pages/InvoicesPage'), ['system:manage']) },
  { path: BILLING_ROUTES.BILLING_CFO,       element: <BillingPage /> },
]
