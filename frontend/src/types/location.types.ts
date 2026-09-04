// Matches every backend module's address sub-schema exactly (Vendor Master,
// Tenant, Camp) — coordinates in GeoJSON [lng, lat] order, NOT [lat, lng].
// Required string fields are never omitted/undefined — a value Google didn't
// return is represented as '', never a missing key (see useReverseGeocode.ts
// and LocationSearchBox.tsx's incomplete-place/failed-geocode handling for
// where this contract actually gets exercised). `country` is the one
// exception: the backend Zod schema treats it as genuinely optional (a
// persisted default like 'India' is applied server-side, not assumed here),
// so it's `undefined` when absent — never `''`, since `.optional()` on a
// `z.string().min(1)` permits the key to be missing but still rejects an
// empty string if present.
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
