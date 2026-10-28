import { createBrowserRouter } from 'react-router-dom'
import { RootLayout, RouteErrorBoundary, RouteFallback, UnauthorizedPage, NotFoundPage } from '@qms/ui'
import AppLayout from '@/components/layouts/AppLayout'
import { lazyRoute } from '@/lib/router/lazyRoute'

const DASHBOARD_PATH = '/'

// Gates "any pharma access at all" — role-type gating (PharmaRoleGate, inside MrPortalPage) decides which portal.
const PHARMA_VIEW_PERMISSIONS = ['camp:book']

const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    // Covers the cold-visit gap before AppLayout's own Suspense mounts (the index route's lazy
    // chunk can still be in flight) — React Router v7's route-level fallback for that window.
    HydrateFallback: RouteFallback,
    children: [
      {
        element: <AppLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          // Lazy-loaded via the router itself (not React.lazy) so its chunk is never in the initial bundle.
          { index: true, lazy: lazyRoute(() => import('@/features/pharma/pages/MrPortalPage'), PHARMA_VIEW_PERMISSIONS) },
          // Standalone deep-link target for the Camp Dossier's "Open page" button.
          { path: '/pharma/camps/:id', lazy: lazyRoute(() => import('@/features/pharma/pages/CampDossierPage'), PHARMA_VIEW_PERMISSIONS) },
          { path: '/unauthorized', element: <UnauthorizedPage homePath={DASHBOARD_PATH} /> },
          // Inside AppLayout so an unauthenticated hit on a bad URL redirects to login, not 404 first.
          { path: '*', element: <NotFoundPage homePath={DASHBOARD_PATH} /> },
        ],
      },
    ],
  },
])

export default appRouter
