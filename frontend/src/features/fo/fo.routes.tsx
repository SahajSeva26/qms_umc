import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const FO_ROUTES = {
  FO:           '/fo',
  FO_WORKSPACE: '/fo/workspace',
  FO_CONFIG:    '/fo/config',
}

export const foRoutes: RouteObject[] = [
  { path: FO_ROUTES.FO,           lazy: lazyRoute(() => import('./pages/FoPage')) },
  { path: FO_ROUTES.FO_WORKSPACE, lazy: lazyRoute(() => import('./pages/FoWorkspacePage')) },
  { path: FO_ROUTES.FO_CONFIG,    lazy: lazyRoute(() => import('./pages/FoConfigPage')) },
]
