import type { RouteObject } from 'react-router-dom'
import DoctorsPage from './pages/DoctorsPage'

export const DOCTORS_ROUTES = {
  DOCTORS: '/doctors',
}

export const doctorsRoutes: RouteObject[] = [
  { path: DOCTORS_ROUTES.DOCTORS, element: <DoctorsPage /> },
]
