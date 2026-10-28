// Coordinates are GeoJSON [lng, lat], NOT [lat, lng]. Mirrors internal-frontend's
// types/location.types.ts, trimmed to the shape this app's camp views actually read.
export interface LocationValue {
  addressLine1: string
  addressLine2?: string
  locality?: string
  city: string
  state: string
  country?: string
  pincode: string
  googlePlaceId?: string
  coordinates?: [number, number]
}
