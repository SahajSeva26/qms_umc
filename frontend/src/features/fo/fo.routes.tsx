import type { RouteObject } from 'react-router-dom'
import FoPage from './pages/FoPage'
import FoWorkspacePage from './pages/FoWorkspacePage'
import FoConfigPage from './pages/FoConfigPage'

export const FO_ROUTES = {
  FO:           '/fo',
  FO_WORKSPACE: '/fo/workspace',
  FO_CONFIG:    '/fo/config',
}

export const foRoutes: RouteObject[] = [
  { path: FO_ROUTES.FO,           element: <FoPage /> },
  { path: FO_ROUTES.FO_WORKSPACE, element: <FoWorkspacePage /> },
  { path: FO_ROUTES.FO_CONFIG,    element: <FoConfigPage /> },
]
