import type { RouteObject } from 'react-router-dom'
import DoctorsPage from './pages/DoctorsPage'

export const doctorsRoutes: RouteObject[] = [
  { path: '/doctors', element: <DoctorsPage /> },
]
