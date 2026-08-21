import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'
import TeleconsultationCampsStubPage from './pages/TeleconsultationCampsStubPage'

export const CAMPS_ROUTES = {
  CAMPS:        '/camps',
  CAMPS_TELE:   '/camps/tele',
  CAMP_NEW:     '/camps/new',
  CAMP_DETAIL:  '/camps/:id',
}

// camp.routes.ts's real GUARD for POST /camps is [camp:manage, tenant:manage]
// — a camp:search-only actor (e.g. an FO) can legitimately read/list camps
// (READ_GUARD includes camp:search) but the backend 403s create. Only the
// NEW route is gated here — CAMP_DETAIL doubles as view+edit and read access
// is legitimate for search-only actors, so its own Save/Move-stage actions
// are conditionally shown inside CampDetailPageReal instead of blocking the
// whole page.
const CAMP_WRITE_PERMISSIONS = ['camp:manage', 'tenant:manage']

// camp.routes.ts's real READ_GUARD for GET / (list) is [camp:search,
// camp:manage, tenant:manage] — matches CAMP_READ_PERMISSIONS below. Found
// 2026-08-04, same class of gap already fixed once for projects/gantt: the
// list route had NO gate at all, so a zero-permission account could still
// see "Camp Management" in the sidebar, navigate to /camps, and land on a
// real 403 "Failed to load camps" error screen instead of a clean redirect
// — verified live against a genuinely zero-permission test account (every
// camp endpoint correctly 403s server-side; this is a UX gap, not a real
// security hole, but worth closing the same way Projects was).
const CAMP_READ_PERMISSIONS = ['camp:search', 'camp:manage', 'tenant:manage']

// camp.routes.ts's real guard for GET /:id is [camp:manage, camp:get,
// tenant:manage] — deliberately NOT camp:search. Confirmed live (2026-08-04):
// unlike Projects (whose GET /:id accepts project:search directly), Camps
// splits "can list/search camps you're assigned to" (camp:search) from "can
// open one camp's full detail" (camp:get) as two separate grantable
// permissions — the real seeded Field Officer RoleType holds both together,
// so this doesn't bite any actual seeded role today, but a search-only
// account (camp:search, no camp:get) would otherwise pass this route's old
// CAMP_READ_PERMISSIONS gate and then 403 on the page's own GET /camps/:id
// call — the exact broken-screen failure mode this gate exists to prevent.
const CAMP_DETAIL_PERMISSIONS = ['camp:get', 'camp:manage', 'tenant:manage']

export const campsRoutes: RouteObject[] = [
  {
    path: CAMPS_ROUTES.CAMPS,
    lazy: lazyRoute(() => import('./pages/CampsPageReal'), CAMP_READ_PERMISSIONS),
  },
  { path: CAMPS_ROUTES.CAMPS_TELE, element: <TeleconsultationCampsStubPage /> },
  {
    path: CAMPS_ROUTES.CAMP_NEW,
    lazy: lazyRoute(() => import('./pages/CampDetailPageReal'), CAMP_WRITE_PERMISSIONS),
  },
  {
    path: CAMPS_ROUTES.CAMP_DETAIL,
    lazy: lazyRoute(() => import('./pages/CampDetailPageReal'), CAMP_DETAIL_PERMISSIONS),
  },
]
