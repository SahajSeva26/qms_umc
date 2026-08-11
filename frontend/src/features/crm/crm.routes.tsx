import type { RouteObject } from 'react-router-dom'
import RequirePermission from '@/components/layouts/RequirePermission'
import CrmPage from './pages/CrmPage'
import AppointmentsPage from './pages/AppointmentsPage'
import SalesDashboardPage from './pages/SalesDashboardPage'

export const CRM_ROUTES = {
  CRM:          '/crm',
  SALES:        '/crm/sales',
  APPOINTMENTS: '/crm/appointments',
}

// Matches lead.routes.ts's READ_GUARD — lead:search is view-only (own leads),
// create/edit/move-stage still need lead:manage/tenant:manage (see CrmPage's
// canManageLeads gate).
const CRM_VIEW_PERMISSIONS = ['lead:search', 'lead:manage', 'tenant:manage']

// Matches appointment.routes.ts's READ_GUARD — separate from CRM_VIEW_PERMISSIONS
// since Appointment has its own permission codes.
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
]
