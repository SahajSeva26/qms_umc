import type { LocationValue } from '@/types/location.types'
import type { GeoCoordinates, GeoProfileAddressFields, GeoProfileAddressPayloadFields, GeoProfileEntity } from '@/types/geoProfile.types'

// Hydrates the picker's LocationValue from a loaded profile's coordinates + address fields.
export function profileToLocationValue(profile: Pick<GeoProfileEntity, 'coordinates'> & GeoProfileAddressFields): LocationValue | null {
  const { coordinates } = profile
  if (!coordinates || coordinates.length !== 2) return null
  return {
    addressLine1: profile.addressLine1 ?? '',
    addressLine2: profile.addressLine2 ?? undefined,
    locality: profile.locality ?? undefined,
    city: profile.city ?? '',
    state: profile.state ?? '',
    country: profile.country ?? undefined,
    pincode: profile.pincode ?? '',
    googlePlaceId: profile.googlePlaceId ?? undefined,
    coordinates,
  }
}

export function locationValueToCoordinates(value: LocationValue | null): GeoCoordinates | undefined {
  return value?.coordinates
}

// Blank strings become `undefined` (absent) — there's no way to explicitly clear a
// field this way, only add/change one, same limitation as Tenant/Vendor addresses.
export function locationValueToAddressPayload(value: LocationValue | null): GeoProfileAddressPayloadFields {
  if (!value) return {}
  return {
    addressLine1: value.addressLine1 || undefined,
    addressLine2: value.addressLine2 || undefined,
    locality: value.locality || undefined,
    city: value.city || undefined,
    state: value.state || undefined,
    country: value.country || undefined,
    pincode: value.pincode || undefined,
    googlePlaceId: value.googlePlaceId || undefined,
  }
}
