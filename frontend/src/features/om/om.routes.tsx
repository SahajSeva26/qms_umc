import type { RouteObject } from 'react-router-dom'
import OmPage from './pages/OmPage'
import IncidentsPage from './pages/IncidentsPage'

export const OM_ROUTES = {
  OM:           '/om',
  OM_INCIDENTS: '/om/incidents',
}

export const omRoutes: RouteObject[] = [
  { path: OM_ROUTES.OM,           element: <OmPage /> },
  { path: OM_ROUTES.OM_INCIDENTS, element: <IncidentsPage /> },
]
