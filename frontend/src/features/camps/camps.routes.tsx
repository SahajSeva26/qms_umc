import type { RouteObject } from 'react-router-dom'
import RequirePermission from '@/components/layouts/RequirePermission'
import CampsPageReal from './pages/CampsPageReal'
import CampDetailPageReal from './pages/CampDetailPageReal'
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

export const campsRoutes: RouteObject[] = [
  { path: CAMPS_ROUTES.CAMPS,      element: <CampsPageReal /> },
  { path: CAMPS_ROUTES.CAMPS_TELE, element: <TeleconsultationCampsStubPage /> },
  {
    path: CAMPS_ROUTES.CAMP_NEW,
    element: (
      <RequirePermission anyOf={CAMP_WRITE_PERMISSIONS}>
        <CampDetailPageReal />
      </RequirePermission>
    ),
  },
  { path: CAMPS_ROUTES.CAMP_DETAIL, element: <CampDetailPageReal /> },
]
