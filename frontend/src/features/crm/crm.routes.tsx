import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'
import * as CrmPaths from './crm.paths'

// A direct `export const` (not a bare re-export specifier) — see camps.routes.tsx for why.
export const CRM_ROUTES = CrmPaths.CRM_ROUTES

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
    lazy: lazyRoute(() => import('./pages/CrmPage'), CRM_VIEW_PERMISSIONS),
  },
  {
    path: CRM_ROUTES.SALES_DASHBOARD,
    lazy: lazyRoute(() => import('./salesDashboard/pages/SalesDashboardPage'), CRM_VIEW_PERMISSIONS),
  },
  {
    path: CRM_ROUTES.APPOINTMENTS,
    lazy: lazyRoute(() => import('./pages/AppointmentsPage'), APPOINTMENT_VIEW_PERMISSIONS),
  },
]
