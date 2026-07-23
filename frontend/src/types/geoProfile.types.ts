// Real backend contract for GeoProfile (backend/src/modules/operations/geoProfile/**).
// Field-staff (FO/Dietitian) location + coverage-radius record, 1:1 with a Role,
// used for camp allocation via the /nearest endpoint. `tenant` is never sent by
// the client — geoProfile.service.ts derives it from the linked Role on create.

export type GeoProfileType = 'fo' | 'dietitian'
export type GeoProfileStatus = 'active' | 'inactive'

/** [longitude, latitude] — GeoJSON order, matches geoProfile.validators.ts's CoordinatesSchema tuple. */
export type GeoCoordinates = [number, number]

// Populated shape for `tenant`/`role` as returned by GET-by-id/search (mapper
// falls back to the raw ObjectId string when population didn't happen —
// GeoProfileMapper.toResponse reads `profile.tenant?._id?.toString?.() ||
// profile.tenant?.toString?.()`, so both shapes are possible on the wire).
export interface GeoProfileEntity {
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
}

export interface SearchGeoProfileQuery {
  type?: GeoProfileType
  role?: string
  status?: GeoProfileStatus
  page?: string
  limit?: string
}

export interface NearestGeoProfileQuery {
  type: GeoProfileType
  lng: number
  lat: number
  limit?: string
}

export interface CreateGeoProfilePayload {
  role: string
  type: GeoProfileType
  coordinates: GeoCoordinates
  coverageRadius?: number
  status?: GeoProfileStatus
  meta?: Record<string, unknown>
}

export interface UpdateGeoProfilePayload {
  type?: GeoProfileType
  coordinates?: GeoCoordinates
  coverageRadius?: number
  status?: GeoProfileStatus
  meta?: Record<string, unknown>
}
