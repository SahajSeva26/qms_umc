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

// Gated on tenant:admin directly (no new division-specific permission code —
// confirmed scope) — this is a customer tenant's OWN admin managing their
// company's master data, not a QMS-internal-staff feature. Matches the
// backend's own route guard on DivisionRouter's create/update/get routes
// exactly (division:manage / tenant:admin — division:manage is deliberately
// left out of this frontend gate since no RoleType actually grants it to a
// tenant-side user yet; a future permission-group-driven grant would still
// pass this check via hasAnyPermission's OR semantics).
//
// system:manage was previously excluded here (via excludeSystemManage) to
// match Sidebar.tsx's PERMISSION_NAV_SECTIONS, which deliberately hid this
// nav entry from QMS's own super-admin. That decision was explicitly
// reversed 2026-07-31 — Rishi asked for system:manage accounts to have
// access too — so the normal RequirePermission bypass is restored here
// (excludeSystemManage removed) to match the sidebar link now being visible
// to them; leaving one but not the other would make this a dead link again,
// the exact bug this comment used to warn about in the opposite direction.
const COMPANY_DATA_VIEW_PERMISSIONS = ['tenant:admin']

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
