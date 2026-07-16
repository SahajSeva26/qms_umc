import type { RouteObject } from 'react-router-dom'
import CampsPage from './pages/CampsPage'
import CampDetailPage from './pages/CampDetailPage'

export const CAMPS_ROUTES = {
  CAMPS:        '/camps',
  CAMPS_TELE:   '/camps/tele',
  CAMP_DETAIL:  '/camps/:id',
}

export const campsRoutes: RouteObject[] = [
  { path: CAMPS_ROUTES.CAMPS,      element: <CampsPage /> },
  {
    path: CAMPS_ROUTES.CAMPS_TELE,
    element: (
      <CampsPage
        lockTab="TELE"
        title="Teleconsultation Camps"
        subtitle="Operations · Remote delivery · Video · IVR / telecall"
      />
    ),
  },
  { path: CAMPS_ROUTES.CAMP_DETAIL, element: <CampDetailPage /> },
]
