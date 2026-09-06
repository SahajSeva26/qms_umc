import type { LocationValue } from '@/types/location.types'
import type { GeoCoordinates } from '@/types/geoProfile.types'

// Geo Profiles store only coordinates, not a full LocationValue — the
// address-string fields the widget internally populates are never read here.
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
