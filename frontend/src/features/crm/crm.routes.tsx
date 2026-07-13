import type { RouteObject } from 'react-router-dom'
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

export const crmRoutes: RouteObject[] = [
  { path: CRM_ROUTES.CRM,          element: <CrmPage /> },
  { path: CRM_ROUTES.SALES,        element: <SalesDashboardPage /> },
  { path: CRM_ROUTES.APPOINTMENTS, element: <AppointmentsPage /> },
  { path: CRM_ROUTES.CLIENTS,      element: <ClientsPage /> },
]
