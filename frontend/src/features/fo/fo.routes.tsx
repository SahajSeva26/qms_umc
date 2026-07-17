import type { RouteObject } from 'react-router-dom'
import FoPage from './pages/FoPage'

export const FO_ROUTES = {
  FO:           '/fo',
  FO_WORKSPACE: '/fo/workspace',
  FO_CONFIG:    '/fo/config',
}

export const foRoutes: RouteObject[] = [
  { path: FO_ROUTES.FO,           element: <FoPage /> },
  { path: FO_ROUTES.FO_WORKSPACE, element: <FoPage /> },
  { path: FO_ROUTES.FO_CONFIG,    element: <FoPage /> },
]
