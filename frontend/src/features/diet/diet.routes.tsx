import type { RouteObject } from 'react-router-dom'
import DietPage from './pages/DietPage'

export const DIET_ROUTES = {
  DIET:           '/diet',
  DIET_APPROVALS: '/diet/approvals',
  DIET_PROFILES:  '/diet/profiles',
}

export const dietRoutes: RouteObject[] = [
  { path: DIET_ROUTES.DIET,           element: <DietPage /> },
  { path: DIET_ROUTES.DIET_APPROVALS, element: <DietPage /> },
  { path: DIET_ROUTES.DIET_PROFILES,  element: <DietPage /> },
]
