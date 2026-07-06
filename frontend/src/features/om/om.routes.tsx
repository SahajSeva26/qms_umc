import type { RouteObject } from 'react-router-dom'
import OmPage from './pages/OmPage'

export const omRoutes: RouteObject[] = [
  { path: '/om', element: <OmPage /> },
]
