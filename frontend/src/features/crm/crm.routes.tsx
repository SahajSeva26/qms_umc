import type { RouteObject } from 'react-router-dom'
import RequirePermission from '@/components/layouts/RequirePermission'
import CrmPage from './pages/CrmPage'
import AppointmentsPage from './pages/AppointmentsPage'
import ClientsPage from './pages/ClientsPage'
import SalesDashboardPage from './pages/SalesDashboardPage'

export const CRM_ROUTES = {
  CRM:          '/crm',
  SALES:        '/crm/sales',
  APPOINTMENTS: '/crm/appointments',
  CLIENTS:      '/crm/clients',
}

// Matches the backend's own READ_GUARD on LeadRouter's GET routes exactly
// (lead.routes.ts: READ_GUARD = [LEAD_PERMISSIONS.SEARCH.code,
// LEAD_PERMISSIONS.MANAGE.code, TENANT_PERMISSIONS.MANAGE.code], OR
// semantics) — a lead:search-only holder (a real "Sales" rep business role,
// see lead.constants.ts's LEAD_BUSINESS_ROLE_TYPES) can view this page (their
// own leads only, server-side row-scoped in lead.service.ts), just not
// create/edit/move-stage — those still require lead:manage/tenant:manage per
// the same routes file, which CrmPage.tsx's own action buttons must respect
// (see its canManageLeads gate). The real, load-bearing check is still that
// backend middleware; this only avoids flashing the page's content before a
// redirect. Per PROGRESS.md's "General-purpose route protection" note,
// /crm is the first non-access-management route to get real backend
// permission codes to check against, so it's the first to be wired up
// beyond that one precedent. Applied to ALL FOUR routes below (index +
// sales/appointments/clients), not just /crm itself — matches
// accessManagement.routes.tsx's own convention (and its comment documenting
// the identical bug class fixed on /admin/tenants/:id) of gating every
// sibling/detail route in a feature the same as its list route, not just
// the entry point.
const CRM_VIEW_PERMISSIONS = ['lead:search', 'lead:manage', 'tenant:manage']

// Matches appointment.routes.ts's real READ_GUARD exactly:
// [appointment:search, appointment:manage, tenant:manage] (OR semantics).
// Deliberately separate from CRM_VIEW_PERMISSIONS above — Appointment is its
// own module with its own permission codes, not gated by Lead's.
const APPOINTMENT_VIEW_PERMISSIONS = ['appointment:search', 'appointment:manage', 'tenant:manage']

export const crmRoutes: RouteObject[] = [
  {
    path: CRM_ROUTES.CRM,
    element: (
      <RequirePermission anyOf={CRM_VIEW_PERMISSIONS}>
        <CrmPage />
      </RequirePermission>
    ),
  },
  {
    path: CRM_ROUTES.SALES,
    element: (
      <RequirePermission anyOf={CRM_VIEW_PERMISSIONS}>
        <SalesDashboardPage />
      </RequirePermission>
    ),
  },
  {
    path: CRM_ROUTES.APPOINTMENTS,
    element: (
      <RequirePermission anyOf={APPOINTMENT_VIEW_PERMISSIONS}>
        <AppointmentsPage />
      </RequirePermission>
    ),
  },
  {
    path: CRM_ROUTES.CLIENTS,
    element: (
      <RequirePermission anyOf={CRM_VIEW_PERMISSIONS}>
        <ClientsPage />
      </RequirePermission>
    ),
  },
]
