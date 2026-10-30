// Coordinates are GeoJSON [lng, lat]. A missing required Google value is `''`, never omitted;
// matches the backend's embedded location schema (doctor/camp/employee/etc.) exactly.
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

export function createEmptyLocationValue(defaultCountry?: string): LocationValue {
  return {
    addressLine1: '',
    addressLine2: undefined,
    locality: undefined,
    city: '',
    state: '',
    country: defaultCountry?.trim() || undefined,
    pincode: '',
    googlePlaceId: undefined,
    coordinates: undefined,
  }
}
