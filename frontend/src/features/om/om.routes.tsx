import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const OM_ROUTES = {
  OM:           '/om',
  OM_INCIDENTS: '/om/incidents',
}

export const omRoutes: RouteObject[] = [
  { path: OM_ROUTES.OM,           lazy: lazyRoute(() => import('./pages/OmPage')) },
  { path: OM_ROUTES.OM_INCIDENTS, lazy: lazyRoute(() => import('./pages/IncidentsPage')) },
]
