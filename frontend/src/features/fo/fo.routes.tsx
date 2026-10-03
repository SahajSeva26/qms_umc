import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const FO_ROUTES = {
  FIELD_OFFICERS:  '/field-officers',
  FIELD_OFFICER_DETAIL: '/field-officers/:id',
}

// Cheap first filter only — field-officer (RoleType + every real Role of that
// type) lives under the platform tenant, so this alone would wrongly admit a
// customer-tenant admin holding the same codes. FieldOfficersPage/
// FieldOfficerDetailPage enforce the remaining platform-tenant condition,
// since RequirePermission has no tenant-type concept.
const FO_VIEW_PERMISSIONS = ['tenant:manage', 'tenant:admin']

export const foRoutes: RouteObject[] = [
  { path: FO_ROUTES.FIELD_OFFICERS, lazy: lazyRoute(() => import('./pages/FieldOfficersPage'), FO_VIEW_PERMISSIONS) },
  { path: FO_ROUTES.FIELD_OFFICER_DETAIL, lazy: lazyRoute(() => import('./pages/FieldOfficerDetailPage'), FO_VIEW_PERMISSIONS) },
]
