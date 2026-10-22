import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'
import * as DietPaths from './diet.paths'

// A direct `export const` (not a bare re-export specifier) — see camps.routes.tsx for why.
export const DIET_ROUTES = DietPaths.DIET_ROUTES

export const dietRoutes: RouteObject[] = [
  { path: DIET_ROUTES.DIET,           lazy: lazyRoute(() => import('./pages/DietPage')) },
  { path: DIET_ROUTES.DIET_APPROVALS, lazy: lazyRoute(() => import('./pages/DietApprovalsPage')) },
  { path: DIET_ROUTES.DIET_PROFILES,  lazy: lazyRoute(() => import('./pages/DietitianProfilesPage')) },
]
