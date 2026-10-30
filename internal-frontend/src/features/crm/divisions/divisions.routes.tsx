import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

// Divisions live inline under a company's own page (TenantDetailPage.tsx) —
// no standalone list route. DIVISION_DETAIL is still reached from that
// inline list.
export const DIVISION_ROUTES = {
  DIVISION_DETAIL: '/crm/divisions/:id',
}

// Matches division.routes.ts's real guard. NOT tenant:manage — unlike every
// sibling module (Lead/Project/Camp/Contact/Appointment), Division's backend
// checks tenant:admin instead (a real backend inconsistency, not a frontend
// guess).
const DIVISION_VIEW_PERMISSIONS = ['division:manage', 'tenant:admin', 'lead:manage']

export const divisionsRoutes: RouteObject[] = [
  {
    path: DIVISION_ROUTES.DIVISION_DETAIL,
    lazy: lazyRoute(() => import('./pages/DivisionDetailPage'), DIVISION_VIEW_PERMISSIONS),
  },
]
