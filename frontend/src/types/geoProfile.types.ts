// Real backend contract for GeoProfile (backend/src/modules/operations/geoProfile/**).
// Field-staff (FO/Dietitian) location + coverage-radius record, 1:1 with a Role,
// used for camp allocation via the /nearest endpoint. `tenant` is never sent by
// the client — geoProfile.service.ts derives it from the linked Role on create.

import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'

export type GeoProfileType = 'fo' | 'dietitian'
export type GeoProfileStatus = 'active' | 'inactive'

/** [longitude, latitude] — GeoJSON order, matches geoProfile.validators.ts's CoordinatesSchema tuple. */
export type GeoCoordinates = [number, number]

// Populated shape for `tenant`/`role` as returned by GET-by-id/search (mapper
// falls back to the raw ObjectId string when population didn't happen —
// GeoProfileMapper.toResponse reads `profile.tenant?._id?.toString?.() ||
// profile.tenant?.toString?.()`, so both shapes are possible on the wire).
// Registered/base address — spread flat on the profile (not nested). The mapper
// returns each field as `?? null` (present-but-null, not absent) when unset.
export interface GeoProfileAddressFields {
  addressLine1: string | null
  addressLine2: string | null
  locality: string | null
  city: string | null
  state: string | null
  country: string | null
  pincode: string | null
  googlePlaceId: string | null
}

export interface GeoProfileEntity extends GeoProfileAddressFields {
  id: string
  tenant: string
  role: string
  type: GeoProfileType
  status: GeoProfileStatus
  coordinates: GeoCoordinates | []
  coverageRadius: number
  meta: Record<string, unknown>
  createdAt: string
  updatedAt: string
  /** Only present on /geo-profiles/nearest results — distance to the query point, in meters. */
  distance?: number
  /** Only present when the /nearest query supplied BOTH date and timeSlot — false means this FO
   * already has a non-cancelled camp in that exact date + slot. */
  available?: boolean
}

export interface SearchGeoProfileQuery {
  type?: GeoProfileType
  role?: string
  status?: GeoProfileStatus
  page?: string
  limit?: string
}

// date and timeSlot are an optional availability check — must be supplied
// together (backend rejects one without the other). When present, each
// returned item is annotated with `available`.
export interface NearestGeoProfileQuery {
  type: GeoProfileType
  lng: number
  lat: number
  limit?: string
  date?: string
  timeSlot?: CampTimeSlotValue
}

// Plain optional strings — no way to explicitly CLEAR an address field this way,
// only to add/change one.
export interface GeoProfileAddressPayloadFields {
  addressLine1?: string
  addressLine2?: string
  locality?: string
  city?: string
  state?: string
  country?: string
  pincode?: string
  googlePlaceId?: string
}

export interface CreateGeoProfilePayload extends GeoProfileAddressPayloadFields {
  role: string
  type: GeoProfileType
  coordinates: GeoCoordinates
  coverageRadius?: number
  status?: GeoProfileStatus
  meta?: Record<string, unknown>
}

export interface UpdateGeoProfilePayload extends GeoProfileAddressPayloadFields {
  type?: GeoProfileType
  coordinates?: GeoCoordinates
  coverageRadius?: number
  status?: GeoProfileStatus
  meta?: Record<string, unknown>
}
