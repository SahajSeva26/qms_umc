import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from '@/components/layouts/RootLayout'
import AppLayout from '@/components/layouts/AppLayout'
import { authRoutes, AUTH_ROUTES } from '@/features/auth/auth.routes'
import { dashboardRoutes } from '@/features/dashboard/dashboard.routes'
import { crmRoutes } from '@/features/crm/crm.routes'
import { campsRoutes } from '@/features/camps/camps.routes'
import { dietRoutes } from '@/features/diet/diet.routes'
import { foRoutes } from '@/features/fo/fo.routes'
import { pharmaRoutes } from '@/features/pharma/pharma.routes'
import { projectsRoutes } from '@/features/projects/projects.routes'
import { omRoutes } from '@/features/om/om.routes'
import { doctorsRoutes } from '@/features/doctors/doctors.routes'
import { billingRoutes } from '@/features/billing/billing.routes'
import { analyticsRoutes } from '@/features/analytics/analytics.routes'
import { adminRoutes } from '@/features/admin/admin.routes'

const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to={AUTH_ROUTES.LOGIN} replace /> },

      // Unauthenticated routes — no shell
      ...authRoutes,

      // Authenticated routes — wrapped in AppLayout (sidebar + topbar)
      {
        element: <AppLayout />,
        children: [
          ...dashboardRoutes,
          ...crmRoutes,
          ...campsRoutes,
          ...dietRoutes,
          ...foRoutes,
          ...pharmaRoutes,
          ...projectsRoutes,
          ...omRoutes,
          ...doctorsRoutes,
          ...billingRoutes,
          ...analyticsRoutes,
          ...adminRoutes,
        ],
      },
    ],
  },
])

export default appRouter
