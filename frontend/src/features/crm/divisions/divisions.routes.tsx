import type { RouteObject } from 'react-router-dom'
import RequirePermission from '@/components/layouts/RequirePermission'
import DivisionsListPage from './pages/DivisionsListPage'
import DivisionDetailPage from './pages/DivisionDetailPage'

export const DIVISION_ROUTES = {
  DIVISIONS: '/crm/divisions',
  DIVISION_DETAIL: '/crm/divisions/:id',
}

// Matches division.routes.ts's real guard on every Division route exactly:
// division:manage OR tenant:manage (division routes actually accept
// tenant:admin server-side too, but tenant:admin is a single-use, non-
// grantable "founding owner" marker minted once per tenant — tenant:manage
// is the real, normally-grantable permission meant to cover this case day to
// day, per direct instruction).
const DIVISION_VIEW_PERMISSIONS = ['division:manage', 'tenant:manage']

export const divisionsRoutes: RouteObject[] = [
  {
    path: DIVISION_ROUTES.DIVISIONS,
    element: (
      <RequirePermission anyOf={DIVISION_VIEW_PERMISSIONS}>
        <DivisionsListPage />
      </RequirePermission>
    ),
  },
  {
    path: DIVISION_ROUTES.DIVISION_DETAIL,
    element: (
      <RequirePermission anyOf={DIVISION_VIEW_PERMISSIONS}>
        <DivisionDetailPage />
      </RequirePermission>
    ),
  },
]
