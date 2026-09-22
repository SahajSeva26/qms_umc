import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const DOCTORS_ROUTES = {
  DOCTORS: '/doctors',
}

export const doctorsRoutes: RouteObject[] = [
  { path: DOCTORS_ROUTES.DOCTORS, lazy: lazyRoute(() => import('./pages/DoctorsPage')) },
]
