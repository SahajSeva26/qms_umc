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

// Places API (New) uses camelCase (longText/shortText); the legacy Geocoding
// API below uses snake_case — do not merge these into one shared-shape function.
interface PlacesAddressComponentLike {
  longText: string | null | undefined
  shortText: string | null | undefined
  types: string[]
}

// Required string fields default to '' (never undefined) when Google omits
// them — validating an incomplete result is the consuming form's job, not this mapper's.
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

// Legacy Geocoding API — snake_case fields, separate mapper on purpose (see PlacesAddressComponentLike above).
interface GeocoderAddressComponentLike {
  long_name: string
  short_name: string
  types: string[]
}

// Same ''-default contract as fromPlacesAddressComponents above.
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
