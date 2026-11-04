import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'
import * as DoctorsPaths from './doctors.paths'

// A direct `export const` (not a bare re-export specifier) — see camps.routes.tsx for why.
export const DOCTORS_ROUTES = DoctorsPaths.DOCTORS_ROUTES

export const doctorsRoutes: RouteObject[] = [
  { path: DOCTORS_ROUTES.DOCTORS, lazy: lazyRoute(() => import('./pages/DoctorsPage')) },
]
