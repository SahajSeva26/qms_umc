import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'
// Matches GET /camps's own guard, which also accepts camp:book (pharma field-force read access —
// the service scopes a division head to their division, and any other non-manage actor to camps
// where they hold an FO/MR/ASM/RSM slot). Shared via lib/access/campAccess.ts so other features
// (e.g. notifications' entity resolver) can check camp reachability without importing this module.
import {
  CAMP_VIEW_PERMISSIONS,
  CAMP_WRITE_PERMISSIONS,
  CAMP_DETAIL_PERMISSIONS,
  CAMP_EDIT_PERMISSIONS,
  CAMP_SCREENING_PERMISSIONS,
} from '@/lib/access/campAccess'
import TeleconsultationCampsStubPage from './pages/TeleconsultationCampsStubPage'
import * as CampsPaths from './camps.paths'

// Re-exported via a direct `export const` (not a bare `export { CAMPS_ROUTES }` specifier) —
// eslint-plugin-react-refresh's only-export-components check treats a bare re-export specifier as
// a nameless export and falls back to matching the identifier's name against a component-name
// pattern (anything starting uppercase, which an ALL_CAPS constant also satisfies), misreading this
// as "this file's component." A direct `export const` is checked against its real initializer
// instead, which correctly resolves as a plain object, same as it did before the constant moved
// into its own camps.paths.ts module.
export const CAMPS_ROUTES = CampsPaths.CAMPS_ROUTES

// CAMP_WRITE_PERMISSIONS: only the NEW route is gated on write perms — viewing (the drawer, at
// CAMPS) and editing (CAMP_EDIT) each check their own narrower permission internally.
// CAMP_DETAIL_PERMISSIONS excludes camp:search alone — list access isn't detail access;
// camp:search-only 403s on GET /camps/:id.
// CAMP_EDIT_PERMISSIONS: update (camp:update) is a distinct backend permission from create.
// CAMP_SCREENING_PERMISSIONS: router-level gate only checks "can this role touch Screening at
// all" — the precise assigned-FO check needs the camp's own `fo` field, inside CampScreeningPage.

export const campsRoutes: RouteObject[] = [
  {
    path: CAMPS_ROUTES.CAMPS,
    lazy: lazyRoute(() => import('./pages/CampsPageReal'), CAMP_VIEW_PERMISSIONS),
  },
  {
    path: CAMPS_ROUTES.CAMPS_SCREENING,
    lazy: lazyRoute(() => import('./pages/ScreeningCampsPage'), CAMP_VIEW_PERMISSIONS),
  },
  {
    path: CAMPS_ROUTES.CAMPS_DIET,
    lazy: lazyRoute(() => import('./pages/DietCampsPage'), CAMP_VIEW_PERMISSIONS),
  },
  { path: CAMPS_ROUTES.CAMPS_TELE, element: <TeleconsultationCampsStubPage /> },
  {
    path: CAMPS_ROUTES.CAMP_NEW,
    lazy: lazyRoute(() => import('./pages/CampDetailPageReal'), CAMP_WRITE_PERMISSIONS),
  },
  {
    // The old view/edit page is gone from this route — redirect to the drawer
    // experience (/camps?camp=<id>) so bookmarks/shared links keep working.
    path: CAMPS_ROUTES.CAMP_DETAIL,
    lazy: lazyRoute(() => import('./pages/CampDetailRedirectPage'), CAMP_DETAIL_PERMISSIONS),
  },
  {
    path: CAMPS_ROUTES.CAMP_EDIT,
    lazy: lazyRoute(() => import('./pages/CampEditPageReal'), CAMP_EDIT_PERMISSIONS),
  },
  {
    path: CAMPS_ROUTES.CAMP_SCREENING,
    lazy: lazyRoute(() => import('@/features/clinical/camp-screening/pages/CampScreeningPage'), CAMP_SCREENING_PERMISSIONS),
  },
]
