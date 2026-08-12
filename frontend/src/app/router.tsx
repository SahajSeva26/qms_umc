import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from '@/components/layouts/RootLayout'
import AppLayout from '@/components/layouts/AppLayout'
import UnauthorizedPage from '@/components/layouts/UnauthorizedPage'
import NotFoundPage from '@/components/layouts/NotFoundPage'
import RouteErrorBoundary from '@/components/layouts/RouteErrorBoundary'
import { authRoutes, AUTH_ROUTES } from '@/features/auth/auth.routes'
import { dashboardRoutes } from '@/features/dashboard/dashboard.routes'
import { crmRoutes } from '@/features/crm/crm.routes'
import { contactsRoutes } from '@/features/contacts/contacts.routes'
import { campsRoutes } from '@/features/camps/camps.routes'
import { dietRoutes } from '@/features/diet/diet.routes'
import { foRoutes } from '@/features/fo/fo.routes'
import { dedicatedOpsRoutes } from '@/features/dedicatedops/dedicatedops.routes'
import { pharmaRoutes } from '@/features/pharma/pharma.routes'
import { projectsRoutes } from '@/features/projects/projects.routes'
import { omRoutes } from '@/features/om/om.routes'
import { doctorsRoutes } from '@/features/doctors/doctors.routes'
import { geoProfileRoutes } from '@/features/geo-profile/geoProfile.routes'
import { billingRoutes } from '@/features/billing/billing.routes'
import { analyticsRoutes } from '@/features/analytics/analytics.routes'
import { adminRoutes } from '@/features/admin/admin.routes'
import { accessManagementRoutes } from '@/features/access-management/accessManagement.routes'
import { divisionsRoutes } from '@/features/crm/divisions/divisions.routes'
import { qaFeedbackRoutes } from '@/features/qa-feedback/qa-feedback.routes'

const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    // Catches anything unhandled anywhere in the tree below — including a
    // lazy-loaded feature chunk failing to fetch (stale deployment) — so a
    // user never sees a blank screen or a raw stack trace.
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to={AUTH_ROUTES.LOGIN} replace /> },

      // Unauthenticated routes — no shell. Eager (not lazy): this is the
      // one path that must render before anything else, and it's already
      // tiny, so splitting it would only add a chunk round-trip with no
      // payload-size benefit.
      ...authRoutes,

      // Authenticated routes — wrapped in AppLayout (sidebar + topbar)
      {
        element: <AppLayout />,
        // A second boundary at the authed-shell level: an error thrown by
        // one feature's lazy chunk (or its render) is caught here instead
        // of unmounting the whole app, though AppLayout itself is not
        // re-rendered underneath an errorElement — see RouteErrorBoundary's
        // own "Refresh" action for the recovery path.
        errorElement: <RouteErrorBoundary />,
        children: [
          { path: '/unauthorized', element: <UnauthorizedPage /> },
          ...dashboardRoutes,
          ...crmRoutes,
          ...contactsRoutes,
          ...campsRoutes,
          ...dietRoutes,
          ...foRoutes,
          ...dedicatedOpsRoutes,
          ...pharmaRoutes,
          ...projectsRoutes,
          ...omRoutes,
          ...doctorsRoutes,
          ...geoProfileRoutes,
          ...billingRoutes,
          ...analyticsRoutes,
          ...adminRoutes,
          ...accessManagementRoutes,
          ...divisionsRoutes,
          ...qaFeedbackRoutes,
          // Authenticated catch-all — keeps the sidebar/topbar for a bad
          // in-app URL instead of falling through to a route-less blank page.
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

export default appRouter
