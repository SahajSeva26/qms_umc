import type { LocationValue } from '@qms/core'

// 'error' counts as unresolved too, same as 'loading', until retried or pinned anyway.
export type LocationResolutionState = 'idle' | 'loading' | 'error'

export const REQUIRED_ADDRESS_FIELDS: { key: 'addressLine1' | 'city' | 'state' | 'pincode'; label: string }[] = [
  { key: 'addressLine1', label: 'address' },
  { key: 'city', label: 'city' },
  { key: 'state', label: 'state' },
  { key: 'pincode', label: 'pincode' },
]

export interface LocationPickerProps {
  apiKey: string
  mapId: string
  value: LocationValue | null
  onChange: (value: LocationValue) => void
  disabled?: boolean
  height?: number
  defaultCenter?: { lat: number; lng: number }
  defaultCountry?: string
  /** e.g. 'IN' — feeds includedRegionCodes on the Autocomplete request. */
  countryCode?: string
  /** Fires on both reverse-geocode and search-box selection — a caller should block submit until 'idle'. */
  onResolutionStateChange?: (status: LocationResolutionState) => void
  /** Fires when coordinates come from the manual lat/lng fallback — no geocoder ran, so an existing address may no longer match. */
  onManualCoordinateEntry?: () => void
  /** Pass through to LocationAddressFields's own `locationHint` prop if rendered alongside this picker. */
  onLocationHintChange?: (hint: string | null) => void
}
