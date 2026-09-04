import type { LocationValue } from '@/types/location.types'
import type { GeoCoordinates } from '@/types/geoProfile.types'

// Coordinate-only usage of LocationPicker: only `coordinates` is ever read
// back out; the required address-string fields the widget still internally
// populates (addressLine1/city/state/pincode) are deliberately never
// rendered (no <LocationAddressFields> alongside this picker) and never
// looked at here. Geo Profiles don't store a LocationValue — only the one
// field that matches, coordinates: [lng, lat].
export function coordinatesToLocationValue(coordinates: GeoCoordinates | [] | undefined): LocationValue | null {
  if (!coordinates || coordinates.length !== 2) return null
  return {
    addressLine1: '', city: '', state: '', pincode: '',
    coordinates,
  }
}

export function locationValueToCoordinates(value: LocationValue | null): GeoCoordinates | undefined {
  return value?.coordinates
}
