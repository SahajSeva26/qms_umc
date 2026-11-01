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
          // Registered at BOTH '/' (bare dev-server root, no proxy in front — localhost:5174/)
          // AND '/pharma' (the actual deployed public root for this build in production — see
          // md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5a; a direct visit to that path, not just '/',
          // must resolve the session's portal the same way, not 404 through the catch-all below).
          { index: true, lazy: lazyRoute(() => import('@/features/pharma/pages/PharmaIndexRedirect'), PHARMA_VIEW_PERMISSIONS) },
          { path: '/pharma', lazy: lazyRoute(() => import('@/features/pharma/pages/PharmaIndexRedirect'), PHARMA_VIEW_PERMISSIONS) },
          // Lazy-loaded via the router itself (not React.lazy) so each role's chunk is never in
          // the initial bundle. PharmaRoleGate (inside each page) still blocks a direct hit on
          // the wrong role's path — this permission check only gates "any pharma access at all".
          { path: '/pharma/mr', lazy: lazyRoute(() => import('@/features/pharma/pages/MrPortalPage'), PHARMA_VIEW_PERMISSIONS) },
          { path: '/pharma/ho', lazy: lazyRoute(() => import('@/features/pharma/pages/HoPortalPage'), PHARMA_VIEW_PERMISSIONS) },
          { path: '/pharma/rsm', lazy: lazyRoute(() => import('@/features/pharma/pages/RsmPortalPage'), PHARMA_VIEW_PERMISSIONS) },
          { path: '/pharma/asm', lazy: lazyRoute(() => import('@/features/pharma/pages/AsmPortalPage'), PHARMA_VIEW_PERMISSIONS) },
          // Standalone deep-link target for the Camp Dossier's "Open page" button. Direct module
          // path, not through features/camps's public barrel (index.ts is eager-hooks-only by
          // design — routing a lazy route target through it would defeat this route's own chunk
          // isolation, confirmed via a real Vite build).
          { path: '/pharma/camps/:id', lazy: lazyRoute(() => import('@/features/camps/pages/CampDossierPage'), PHARMA_VIEW_PERMISSIONS) },
          // Sidebar-level page, distinct from the small "Doctors" tab already inside
          // MrPortalPage — reachable by all four pharma role types, gated internally by
          // PharmaRoleGate (see DoctorManagementPage.tsx) with a different permission ceiling
          // per role (see that file's header comment).
          { path: '/pharma/doctors', lazy: lazyRoute(() => import('@/features/doctors/pages/DoctorManagementPage'), PHARMA_VIEW_PERMISSIONS) },
          // Sidebar-level page, distinct from the lighter "Camp schedule" portal tabs — see
          // CampManagementPage.tsx's header comment for the full rationale.
          { path: '/pharma/camps', lazy: lazyRoute(() => import('@/features/camps/pages/CampManagementPage'), PHARMA_VIEW_PERMISSIONS) },
          { path: '/unauthorized', element: <UnauthorizedPage homePath={DASHBOARD_PATH} /> },
          // Inside AppLayout so an unauthenticated hit on a bad URL redirects to login, not 404 first.
          { path: '*', element: <NotFoundPage homePath={DASHBOARD_PATH} /> },
        ],
      },
    ],
  },
])

export default appRouter
