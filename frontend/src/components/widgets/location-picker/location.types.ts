import type { LocationValue } from '@/types/location.types'

// The pin can move (or fail) well before a matching `onChange` fires; 'error'
// counts as unresolved too, same as 'loading', until retried or pinned anyway.
export type LocationResolutionState = 'idle' | 'loading' | 'error'

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
  /** Fires on reverse-geocode state changes (pin drop/drag only — search selections resolve synchronously). A caller that passes this should block submit until the state is 'idle'. */
  onResolutionStateChange?: (status: LocationResolutionState) => void
}
