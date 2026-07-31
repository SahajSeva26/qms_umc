import type { RouteObject } from 'react-router-dom'
import RequirePermission from '@/components/layouts/RequirePermission'
import DivisionsListPage from '@/features/company-data/divisions/pages/DivisionsListPage'

// Route-constant exports, matching every other feature's `[FEATURE]_ROUTES`
// convention (see CLAUDE.md's routing rule). "Company Data" is a tenant-
// admin-only operations category — a customer tenant's own admin manages
// their company's master data here (divisions today; preferences/
// configuration are the natural next additions once QMS builds a real
// backend for them).
export const COMPANY_DATA_ROUTES = {
  DIVISIONS: '/company-data/divisions',
}

// Matches the backend's own real route guard on every DivisionRouter route
// exactly: division:manage OR tenant:admin (division.routes.ts). Previously
// this list only had 'tenant:admin' — division:manage was deliberately left
// out under the assumption "no RoleType actually grants it to a tenant-side
// user yet," but that assumption went stale: Sales Head has held
// division:manage since defaultRoleTypes.ts's 2026-07-30 change, and could
// reach every Division backend endpoint while being unable to even open
// this page on the frontend. Fixed 2026-07-31 by adding division:manage
// here to match reality.
//
// system:manage was previously excluded here (via excludeSystemManage) to
// match Sidebar.tsx's PERMISSION_NAV_SECTIONS, which deliberately hid this
// nav entry from QMS's own super-admin. That decision was explicitly
// reversed 2026-07-31 — Rishi asked for system:manage accounts to have
// access too — so the normal RequirePermission bypass is restored here
// (excludeSystemManage removed) to match the sidebar link now being visible
// to them; leaving one but not the other would make this a dead link again,
// the exact bug this comment used to warn about in the opposite direction.
const COMPANY_DATA_VIEW_PERMISSIONS = ['division:manage']

export const companyDataRoutes: RouteObject[] = [
  {
    path: COMPANY_DATA_ROUTES.DIVISIONS,
    element: (
      <RequirePermission anyOf={COMPANY_DATA_VIEW_PERMISSIONS}>
        <DivisionsListPage />
      </RequirePermission>
    ),
  },
]
