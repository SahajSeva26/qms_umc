import type { RouteObject } from 'react-router-dom'
import CrmPage from './pages/CrmPage'

export const crmRoutes: RouteObject[] = [
  { path: '/crm', element: <CrmPage /> },
]
