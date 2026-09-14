// Coordinates are GeoJSON [lng, lat], NOT [lat, lng]. Required string fields
// are never omitted — a missing Google value is `''`; `country` alone is genuinely optional (`undefined`).
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

/** Empty LocationValue, filled in only with what the caller explicitly wants as defaults. */
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
