import type { LocationValue } from '@/types/location.types'

// The pin can move (or fail) well before a matching `onChange` fires; 'error'
// counts as unresolved too, same as 'loading', until retried or pinned anyway.
export type LocationResolutionState = 'idle' | 'loading' | 'error'

export const REQUIRED_ADDRESS_FIELDS: { key: 'addressLine1' | 'city' | 'state' | 'pincode'; label: string }[] = [
  { key: 'addressLine1', label: 'address' },
  { key: 'city', label: 'city' },
  { key: 'state', label: 'state' },
  { key: 'pincode', label: 'pincode' },
]

export interface LocationPickerProps {
  value: LocationValue | null
  onChange: (value: LocationValue) => void
  disabled?: boolean
  height?: number
  /** Fallback pin/camera center when there's no existing value (e.g. a fresh Create form). */
  defaultCenter?: { lat: number; lng: number }
  /** e.g. 'India' — used to fill `country` when a result/failure path can't supply one. Caller-owned, not hardcoded here. */
  defaultCountry?: string
  /** e.g. 'IN' — feeds includedRegionCodes on the Autocomplete request. Caller-owned product rule. */
  countryCode?: string
  /** Fires on both pin-drop/drag reverse-geocode and search-box selection state changes — both are async. A caller that passes this should block submit until the state is 'idle'. */
  onResolutionStateChange?: (status: LocationResolutionState) => void
  /** Fires when coordinates come from the Maps-unavailable manual lat/lng fallback — no
   *  geocoder ever ran, so any existing address may no longer match. The picker only reports
   *  this; whether that's a hard block (address required) or a soft warning is caller-owned. */
  onManualCoordinateEntry?: () => void
}
