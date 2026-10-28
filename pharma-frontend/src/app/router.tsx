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
          // Sends each session to its own role's portal path below — not a page of its own.
          { index: true, lazy: lazyRoute(() => import('@/features/pharma/pages/PharmaIndexRedirect'), PHARMA_VIEW_PERMISSIONS) },
          // Lazy-loaded via the router itself (not React.lazy) so each role's chunk is never in
          // the initial bundle. PharmaRoleGate (inside each page) still blocks a direct hit on
          // the wrong role's path — this permission check only gates "any pharma access at all".
          { path: '/pharma/mr', lazy: lazyRoute(() => import('@/features/pharma/pages/MrPortalPage'), PHARMA_VIEW_PERMISSIONS) },
          { path: '/pharma/ho', lazy: lazyRoute(() => import('@/features/pharma/pages/HoPortalPage'), PHARMA_VIEW_PERMISSIONS) },
          { path: '/pharma/rsm', lazy: lazyRoute(() => import('@/features/pharma/pages/RsmPortalPage'), PHARMA_VIEW_PERMISSIONS) },
          { path: '/pharma/asm', lazy: lazyRoute(() => import('@/features/pharma/pages/AsmPortalPage'), PHARMA_VIEW_PERMISSIONS) },
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
