import type { RouteObject } from 'react-router-dom'
import PharmaPage from './pages/PharmaPage'

export const pharmaRoutes: RouteObject[] = [
  { path: '/pharma', element: <PharmaPage /> },
]
