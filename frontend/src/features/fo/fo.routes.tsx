import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const FO_ROUTES = {
  FO:           '/fo',
  FO_WORKSPACE: '/fo/workspace',
  FO_CONFIG:    '/fo/config',
}

// Cheap first filter only — field-officer (RoleType + every real Role of that
// type) lives under the platform tenant, so this alone would wrongly admit a
// customer-tenant admin holding the same codes. FoPage itself enforces the
// remaining platform-tenant condition, since RequirePermission has no tenant-type concept.
const FO_VIEW_PERMISSIONS = ['tenant:manage', 'tenant:admin']

export const foRoutes: RouteObject[] = [
  { path: FO_ROUTES.FO,           lazy: lazyRoute(() => import('./pages/FoPage'), FO_VIEW_PERMISSIONS) },
  { path: FO_ROUTES.FO_WORKSPACE, lazy: lazyRoute(() => import('./pages/FoWorkspacePage')) },
  { path: FO_ROUTES.FO_CONFIG,    lazy: lazyRoute(() => import('./pages/FoConfigPage')) },
]
