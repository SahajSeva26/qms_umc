import type { RouteObject } from 'react-router-dom'
import GeoProfilesListPage from '@/features/geo-profile/pages/GeoProfilesListPage'
import GeoProfileDetailPage from '@/features/geo-profile/pages/GeoProfileDetailPage'
import NearestGeoProfilesPage from '@/features/geo-profile/pages/NearestGeoProfilesPage'

// NOTE: nothing under features/geo-profile/** imports GEO_PROFILE_ROUTES back
// from this file — every in-feature navigate() call below uses a literal path
// string instead. This file (geoProfile.routes.tsx) imports the page
// components at module scope, so a page (or anything IT imports, e.g.
// GeoProfilesTable.tsx) importing GEO_PROFILE_ROUTES back from here creates a
// circular import that crashes the whole app at boot with "Cannot access
// 'GeoProfilesListPage' before initialization" — the exact same class of bug
// documented for Camp (camps.routes.tsx) earlier this session, found live
// here via a 2026-07-24 test-fix verification pass and fixed the same way.
// GEO_PROFILE_ROUTES itself is still exported and fine to import from
// OUTSIDE this feature (e.g. navConfig.ts), which isn't part of the cycle.
export const GEO_PROFILE_ROUTES = {
  GEO_PROFILES: '/geo-profiles',
  GEO_PROFILE_DETAIL: '/geo-profiles/:id',
  GEO_PROFILE_NEW: '/geo-profiles/new',
  GEO_PROFILE_NEAREST: '/geo-profiles/nearest-lookup',
}

// Per geoProfile.routes.ts on the backend: reads (search/get/nearest) are open
// to any authenticated user, only create/update are gated on
// `geo-profile:manage`. So unlike the access-management entities (fully
// gated end-to-end via RequirePermission), there is no read-side route guard
// here — a non-privileged user's create/edit submit just surfaces the
// backend's own 403 in the mutation's error state (same pattern as Doctor's
// EditDoctorModal).
export const geoProfileRoutes: RouteObject[] = [
  { path: GEO_PROFILE_ROUTES.GEO_PROFILES, element: <GeoProfilesListPage /> },
  { path: GEO_PROFILE_ROUTES.GEO_PROFILE_NEAREST, element: <NearestGeoProfilesPage /> },
  { path: GEO_PROFILE_ROUTES.GEO_PROFILE_NEW, element: <GeoProfileDetailPage /> },
  { path: GEO_PROFILE_ROUTES.GEO_PROFILE_DETAIL, element: <GeoProfileDetailPage /> },
]
