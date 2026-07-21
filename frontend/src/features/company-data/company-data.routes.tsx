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
// excludeSystemManage: RequirePermission's normal system:manage bypass would
// otherwise let a real QMS super-admin reach this route directly by URL even
// though Sidebar.tsx deliberately hides its nav entry from them (same
// excludeSystemManage reasoning as PERMISSION_NAV_SECTIONS there) — without
// this, hiding the nav link is only cosmetic, not an actual access boundary,
// for the one account type it's specifically meant to exclude. Found live:
// system@gmail.com could reach /company-data/divisions by typing the URL
// directly despite never seeing it in their own sidebar.
const COMPANY_DATA_VIEW_PERMISSIONS = ['tenant:admin']

export const companyDataRoutes: RouteObject[] = [
  {
    path: COMPANY_DATA_ROUTES.DIVISIONS,
    element: (
      <RequirePermission anyOf={COMPANY_DATA_VIEW_PERMISSIONS} excludeSystemManage>
        <DivisionsListPage />
      </RequirePermission>
    ),
  },
]
