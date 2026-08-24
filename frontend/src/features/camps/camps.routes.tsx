import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'
import TeleconsultationCampsStubPage from './pages/TeleconsultationCampsStubPage'

export const CAMPS_ROUTES = {
  CAMPS:        '/camps',
  CAMPS_TELE:   '/camps/tele',
  CAMP_NEW:     '/camps/new',
  CAMP_DETAIL:  '/camps/:id',
}

// Only the NEW route is gated on write perms — CAMP_DETAIL doubles as view+edit,
// so its Save/Move-stage actions are conditionally shown inside CampDetailPageReal instead.
const CAMP_WRITE_PERMISSIONS = ['camp:create', 'camp:manage', 'tenant:manage']

// NOTE: camp.routes.ts's real GET / guard also accepts camp:book (pharma field-force
// read access), missing here — a book-only actor gets redirected to /unauthorized
// by this frontend gate before ever reaching the backend.
const CAMP_READ_PERMISSIONS = ['camp:search', 'camp:manage', 'tenant:manage']

// Same camp:book gap as CAMP_READ_PERMISSIONS. Deliberately excludes camp:search
// alone — list access isn't detail access; camp:search-only 403s on GET /camps/:id.
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
