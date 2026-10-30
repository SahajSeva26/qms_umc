import type { LocationValue } from '@qms/core'

/** [lng, lat] storage order -> {lat, lng} for the Maps JS API. */
export function toLatLngLiteral(coordinates: [number, number]): google.maps.LatLngLiteral {
  const [lng, lat] = coordinates
  return { lat, lng }
}

export function toCoordinatesTuple(point: { lat: number; lng: number }): [number, number] {
  return [point.lng, point.lat]
}

// Places API (New) uses camelCase; the legacy Geocoding API below uses snake_case — don't merge these.
interface PlacesAddressComponentLike {
  longText: string | null | undefined
  shortText: string | null | undefined
  types: string[]
}

// Required string fields default to '' when Google omits them — validation is the form's job.
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

// Legacy Geocoding API — snake_case, kept separate on purpose (see PlacesAddressComponentLike above).
interface GeocoderAddressComponentLike {
  long_name: string
  short_name: string
  types: string[]
}

interface GeocoderResultLike {
  address_components: GeocoderAddressComponentLike[]
  formatted_address?: string
  plus_code?: { global_code?: string; compound_code?: string }
}

// Same ''-default contract as fromPlacesAddressComponents. Reads only the primary result.
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

export interface GeocoderFallbackResult {
  address: Omit<LocationValue, 'coordinates'>
  locationHint: string | null
}

// Scans every result for a postal_code when the primary lacks one — never derived from city/state.
export function fromGeocoderAddressComponentsWithFallback(
  results: GeocoderResultLike[],
  placeId: string | null | undefined,
  defaultCountry?: string,
): GeocoderFallbackResult {
  const primary = results[0]
  const address = fromGeocoderAddressComponents(primary?.address_components ?? [], placeId, defaultCountry)

  if (!address.pincode) {
    for (const result of results) {
      const postalComponent = result.address_components.find((c) => c.types.includes('postal_code'))
      if (postalComponent?.long_name) {
        address.pincode = postalComponent.long_name
        break
      }
    }
  }

  // Falls back to a Plus Code when Google has no formatted address either.
  const locationHint = primary?.formatted_address || primary?.plus_code?.compound_code || primary?.plus_code?.global_code || null

  return { address, locationHint }
}
