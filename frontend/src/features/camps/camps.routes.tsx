import type { RouteObject } from 'react-router-dom'
import CampsPage from './pages/CampsPage'

export const campsRoutes: RouteObject[] = [
  { path: '/camps', element: <CampsPage /> },
]
