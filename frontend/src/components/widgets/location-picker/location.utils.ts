import type { LocationValue } from '@/types/location.types'

/** [lng, lat] (this component's/every backend module's storage order) -> {lat, lng} (what the Maps JS API/UI wants). */
export function toLatLngLiteral(coordinates: [number, number]): google.maps.LatLngLiteral {
  const [lng, lat] = coordinates
  return { lat, lng }
}

/** {lat, lng} -> [lng, lat] (GeoJSON order, this component's storage order). */
export function toCoordinatesTuple(point: { lat: number; lng: number }): [number, number] {
  return [point.lng, point.lat]
}

// The Places API (New) uses camelCase field names (longText/shortText) on
// `google.maps.places.AddressComponent` — confirmed genuinely different from
// the legacy Geocoding API's snake_case GeocoderAddressComponent below. Do
// not merge these into one function assuming a shared shape.
interface PlacesAddressComponentLike {
  longText: string | null | undefined
  shortText: string | null | undefined
  types: string[]
}

/**
 * Maps a Places API (New) `Place.addressComponents` array + optional place id
 * into a LocationValue. Required string fields default to '' when Google
 * doesn't supply them (never undefined/omitted) — a selected place can
 * genuinely lack a street number or postal code (e.g. a locality-level
 * result); the consuming form's own required-field validation is what
 * actually blocks saving on an incomplete result, not this mapper.
 */
export function fromPlacesAddressComponents(
  components: PlacesAddressComponentLike[],
  placeId: string | null | undefined,
  defaultCountry?: string,
): Omit<LocationValue, 'coordinates'> {
  const byType = (type: string) => components.find((c) => c.types.includes(type))

  const streetNumber = byType('street_number')?.longText ?? ''
  const route = byType('route')?.longText ?? ''
  const addressLine1 = [streetNumber, route].filter(Boolean).join(' ').trim()

  const locality = byType('sublocality')?.longText ?? byType('neighborhood')?.longText ?? undefined
  const city = byType('locality')?.longText ?? ''
  const state = byType('administrative_area_level_1')?.longText ?? ''
  const pincode = byType('postal_code')?.longText ?? ''
  const country = byType('country')?.longText || defaultCountry?.trim() || undefined

  return {
    addressLine1,
    addressLine2: undefined,
    locality,
    city,
    state,
    country,
    pincode,
    googlePlaceId: placeId ?? undefined,
  }
}

// The legacy Geocoding API uses snake_case field names (long_name/short_name)
// on `google.maps.GeocoderAddressComponent` — genuinely different naming
// from the Places API's AddressComponent above, confirmed via Google's own
// reference docs for each API. A separate mapper on purpose.
interface GeocoderAddressComponentLike {
  long_name: string
  short_name: string
  types: string[]
}

/** Maps a Geocoding API `GeocoderResult` into a LocationValue. Same '' contract as fromPlacesAddressComponents. */
export function fromGeocoderAddressComponents(
  components: GeocoderAddressComponentLike[],
  placeId: string | null | undefined,
  defaultCountry?: string,
): Omit<LocationValue, 'coordinates'> {
  const byType = (type: string) => components.find((c) => c.types.includes(type))

  const streetNumber = byType('street_number')?.long_name ?? ''
  const route = byType('route')?.long_name ?? ''
  const addressLine1 = [streetNumber, route].filter(Boolean).join(' ').trim()

  const locality = byType('sublocality')?.long_name ?? byType('neighborhood')?.long_name ?? undefined
  const city = byType('locality')?.long_name ?? ''
  const state = byType('administrative_area_level_1')?.long_name ?? ''
  const pincode = byType('postal_code')?.long_name ?? ''
  const country = byType('country')?.long_name || defaultCountry?.trim() || undefined

  return {
    addressLine1,
    addressLine2: undefined,
    locality,
    city,
    state,
    country,
    pincode,
    googlePlaceId: placeId ?? undefined,
  }
}
