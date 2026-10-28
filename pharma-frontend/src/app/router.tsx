import { createBrowserRouter } from 'react-router-dom'
import { RootLayout, RouteErrorBoundary, UnauthorizedPage, NotFoundPage } from '@qms/ui'
import AppLayout from '@/components/layouts/AppLayout'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'

const DASHBOARD_PATH = '/'

const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AppLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: '/unauthorized', element: <UnauthorizedPage homePath={DASHBOARD_PATH} /> },
          // Catch-all stays inside AppLayout so it still goes through the
          // session check — an unauthenticated hit on a bad URL correctly
          // redirects to the shared login rather than showing 404 first.
          { path: '*', element: <NotFoundPage homePath={DASHBOARD_PATH} /> },
        ],
      },
    ],
  },
])

export default appRouter
