import type { RouteObject } from 'react-router-dom'
import GeoProfilesListPage from '@/features/geo-profile/pages/GeoProfilesListPage'
import GeoProfileDetailPage from '@/features/geo-profile/pages/GeoProfileDetailPage'
import NearestGeoProfilesPage from '@/features/geo-profile/pages/NearestGeoProfilesPage'

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
