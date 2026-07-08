import type { RouteObject } from 'react-router-dom'
import CampsPage from './pages/CampsPage'

export const CAMPS_ROUTES = {
  CAMPS:      '/camps',
  CAMPS_TELE: '/camps/tele',
}

export const campsRoutes: RouteObject[] = [
  { path: CAMPS_ROUTES.CAMPS,      element: <CampsPage /> },
  { path: CAMPS_ROUTES.CAMPS_TELE, element: <CampsPage /> },
]
