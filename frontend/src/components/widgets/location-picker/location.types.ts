import type { LocationValue } from '@/types/location.types'

/**
 * Whether a pin drop/drag's reverse-geocode is still resolving. A caller
 * whose `onChange` only fires once resolution completes (i.e. every
 * consumer today) needs this to know when its OWN `value`/`onChange` state
 * is stale relative to what the user visually sees on the map — the pin can
 * move (and geocoding can fail) well before `onChange` ever fires again.
 * Consumers that gate a Save/Submit action on `value` alone can otherwise
 * report success while silently keeping the old coordinates. 'error' counts
 * as unresolved too — an error-state pin is exactly as unresolved as a
 * loading one until the user retries or explicitly picks "Use this pin".
 */
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
  /**
   * Fires whenever the in-progress reverse-geocode state changes (pin
   * drop/drag only — search selections resolve synchronously and never go
   * through 'loading'/'error'). Opt-in: existing callers that don't pass
   * this see no behavior change. A caller that DOES pass it should block
   * its own submit action while the last-reported state isn't 'idle', since
   * neither 'loading' nor 'error' has produced a matching `onChange` yet.
   */
  onResolutionStateChange?: (status: LocationResolutionState) => void
}
