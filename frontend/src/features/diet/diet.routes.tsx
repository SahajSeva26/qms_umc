import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const DIET_ROUTES = {
  DIET:           '/diet',
  DIET_APPROVALS: '/diet/approvals',
  DIET_PROFILES:  '/diet/profiles',
}

export const dietRoutes: RouteObject[] = [
  { path: DIET_ROUTES.DIET,           lazy: lazyRoute(() => import('./pages/DietPage')) },
  { path: DIET_ROUTES.DIET_APPROVALS, lazy: lazyRoute(() => import('./pages/DietApprovalsPage')) },
  { path: DIET_ROUTES.DIET_PROFILES,  lazy: lazyRoute(() => import('./pages/DietitianProfilesPage')) },
]
