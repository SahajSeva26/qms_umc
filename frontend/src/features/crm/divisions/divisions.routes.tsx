import type { RouteObject } from 'react-router-dom'
import RequirePermission from '@/components/layouts/RequirePermission'
import DivisionsListPage from './pages/DivisionsListPage'
import DivisionDetailPage from './pages/DivisionDetailPage'

export const DIVISION_ROUTES = {
  DIVISIONS: '/crm/divisions',
  DIVISION_DETAIL: '/crm/divisions/:id',
}

// CONFIRMED DRIFT (2026-08-10): this used to be ['division:manage',
// 'tenant:manage'] on the theory that tenant:admin is a non-grantable,
// single-use "founding owner" marker and tenant:manage is the real,
// day-to-day grantable equivalent. Direct read of division.routes.ts shows
// the opposite is true for THIS module: every Division route
// (GET/PUT/POST /:id, GET/POST /, POST /bulk-mr) checks division:manage +
// tenant:admin — tenant:manage is never checked anywhere in that file,
// even though tenant:admin is in fact a normal, freely-assignable
// permission (it's just the code the auto-provisioned per-tenant "admin"
// RoleType happens to carry — nothing stops granting it to any other
// RoleType via Permission Groups). Every sibling module (Lead, Project,
// Camp, Contact, Appointment) DOES check tenant:manage as its baseline —
// Division is the sole outlier missing it, which looks like a real
// backend gap worth a direct fix request, not a frontend guess to route
// around. Per instruction: match what the backend actually does today,
// not what it "should" do — union of every code that lets list OR detail
// load (list search also accepts lead:manage; tenant:manage matches
// nothing here and is intentionally left out until/unless the backend
// route is updated to accept it like its siblings do).
const DIVISION_VIEW_PERMISSIONS = ['division:manage', 'tenant:admin', 'lead:manage']

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
