import type { RouteObject } from 'react-router-dom'
import BillingPage from './pages/BillingPage'
import { lazyRoute } from '@/lib/router/lazyRoute'
import * as BillingPaths from './billing.paths'

// A direct `export const` (not a bare re-export specifier) — see camps.routes.tsx for why.
export const BILLING_ROUTES = BillingPaths.BILLING_ROUTES

// BILLING/BILLING_CFO are still stubs (no dedicated backend module yet, see
// root CLAUDE.md's module status table) — kept eager since BillingPage is
// small and there's no chunk worth splitting out. Dietitian Payment is a
// Diet Camp Coordination screen (payment workbench over Diet camps/
// dietitians) routed under /billing/dietitian for nav purposes only — its
// page component lives in features/diet/, not in this billing feature.
//
// Invoice readers can use the pipeline. Generate and project/camp controls
// are gated separately by the page on their actual read permissions.
export const billingRoutes: RouteObject[] = [
  { path: BILLING_ROUTES.BILLING,           element: <BillingPage /> },
  { path: BILLING_ROUTES.BILLING_DIETITIAN, lazy: lazyRoute(() => import('@/features/diet/pages/DietitianPaymentPage')) },
  { path: BILLING_ROUTES.BILLING_CRM,       lazy: lazyRoute(() => import('./pages/InvoicesPage'), ['invoice:search', 'invoice:manage', 'tenant:manage']) },
  { path: BILLING_ROUTES.BILLING_CFO,       element: <BillingPage /> },
]
