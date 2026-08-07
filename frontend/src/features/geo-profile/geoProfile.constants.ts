import type { GeoProfileStatus, GeoProfileType } from '@/types/geoProfile.types'

export const GEO_PROFILE_ROUTES = {
  GEO_PROFILES: '/geo-profiles',
  GEO_PROFILE_DETAIL: '/geo-profiles/:id',
  GEO_PROFILE_NEW: '/geo-profiles/new',
  GEO_PROFILE_NEAREST: '/geo-profiles/nearest-lookup',
}

export const GEO_PROFILE_TYPE_OPTIONS: { value: GeoProfileType; label: string }[] = [
  { value: 'fo', label: 'Field Officer' },
  { value: 'dietitian', label: 'Dietitian' },
]

export const GEO_PROFILE_TYPE_LABEL: Record<GeoProfileType, string> = {
  fo: 'Field Officer',
  dietitian: 'Dietitian',
}

export const GEO_PROFILE_STATUS_OPTIONS: { value: GeoProfileStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export const GEO_PROFILE_STATUS_LABEL: Record<GeoProfileStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}
