import type { RouteObject } from 'react-router-dom'
import DietPage from './pages/DietPage'

export const dietRoutes: RouteObject[] = [
  { path: '/diet', element: <DietPage /> },
]
