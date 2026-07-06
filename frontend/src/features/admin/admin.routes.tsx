import type { RouteObject } from 'react-router-dom'
import AdminPage from './pages/AdminPage'

export const adminRoutes: RouteObject[] = [
  { path: '/admin', element: <AdminPage /> },
]
