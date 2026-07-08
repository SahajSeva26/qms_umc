import type { RouteObject } from 'react-router-dom'
import OmPage from './pages/OmPage'

export const OM_ROUTES = {
  OM:           '/om',
  OM_INCIDENTS: '/om/incidents',
}

export const omRoutes: RouteObject[] = [
  { path: OM_ROUTES.OM,           element: <OmPage /> },
  { path: OM_ROUTES.OM_INCIDENTS, element: <OmPage /> },
]
