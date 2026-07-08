import type { RouteObject } from 'react-router-dom'
import CrmPage from './pages/CrmPage'

export const CRM_ROUTES = {
  CRM:          '/crm',
  SALES:        '/crm/sales',
  APPOINTMENTS: '/crm/appointments',
  CLIENTS:      '/crm/clients',
}

export const crmRoutes: RouteObject[] = [
  { path: CRM_ROUTES.CRM,          element: <CrmPage /> },
  { path: CRM_ROUTES.SALES,        element: <CrmPage /> },
  { path: CRM_ROUTES.APPOINTMENTS, element: <CrmPage /> },
  { path: CRM_ROUTES.CLIENTS,      element: <CrmPage /> },
]
