import type { RouteObject } from 'react-router-dom'
import DedicatedOpsPage from './pages/DedicatedOpsPage'

export const DEDICATEDOPS_ROUTES = {
  DEDICATEDOPS: '/fo/dedicated',
}

export const dedicatedOpsRoutes: RouteObject[] = [
  { path: DEDICATEDOPS_ROUTES.DEDICATEDOPS, element: <DedicatedOpsPage /> },
]
