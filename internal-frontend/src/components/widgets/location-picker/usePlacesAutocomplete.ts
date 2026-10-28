import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { fromPlacesAddressComponents, toCoordinatesTuple } from './location.utils'
import type { LocationValue } from '@/types/location.types'

export interface Suggestion {
  placePrediction: google.maps.places.PlacePrediction
}

export interface SelectedPlaceDetails {
  value: LocationValue
  /** Raw place types (e.g. 'administrative_area_level_1', 'locality') — lets a caller validate
   * the selection is actually the kind of place it expected, not just any (regions)-collection match. */
  types: string[]
  /** The place's bounding box, when Google returns one (e.g. a state/city, not a street address). */
  viewport: google.maps.LatLngBounds | null
}

interface UsePlacesAutocompleteOptions {
  input: string
  /** Raw, un-debounced query, used only to detect a cleared box instantly. Falls back to `input` when omitted. */
  rawInput?: string
  countryCode?: string
  defaultCountry?: string
  /** Restricts predictions to these primary types (e.g. ['administrative_area_level_1'] for states,
   * ['locality'] for cities). Omit for the default address-search behavior (no restriction). */
  includedPrimaryTypes?: string[]
  /** Restricts predictions to this geometric bounds (e.g. a selected state's viewport, for a
   * City search scoped to it). A place id can't be used directly — resolve it to a viewport first. */
  locationRestriction?: google.maps.places.LocationRestriction | null
  onSelected: (value: LocationValue) => void
  /** Parallel to onSelected — also receives the raw types/viewport a plain LocationValue can't carry.
   * Optional so existing address-search callers (LocationSearchBox) are unaffected. */
  onSelectedDetails?: (details: SelectedPlaceDetails) => void
}

// Uses the programmatic Places API (AutocompleteSuggestion + AutocompleteSessionToken),
// not the PlaceAutocompleteElement widget or the legacy Autocomplete class.
export function usePlacesAutocomplete({
  input,
  rawInput,
  countryCode,
  defaultCountry,
  includedPrimaryTypes,
  locationRestriction,
  onSelected,
  onSelectedDetails,
}: UsePlacesAutocompleteOptions) {
  const clearWatchInput = rawInput ?? input
  const placesLibrary = useMapsLibrary('places')

  // Callers (e.g. StateCityFilter) pass array literals inline on every render — a fresh reference
  // each time would retrigger the fetch effect below in an infinite loop once it depends on this
  // value. Stabilize by content (join key) so the effect only re-fires on an actual type change.
  const includedPrimaryTypesKey = includedPrimaryTypes?.join(',') ?? ''
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed by includedPrimaryTypesKey, not the array reference itself
  const stableIncludedPrimaryTypes = useMemo(() => includedPrimaryTypes, [includedPrimaryTypesKey])

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const latestRequestId = useRef(0)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

  const ensureSessionToken = useCallback(() => {
    if (!placesLibrary) return null
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new placesLibrary.AutocompleteSessionToken()
    }
    return sessionTokenRef.current
  }, [placesLibrary])

  // Watches the raw query, not debounced, so a clear invalidates in-flight
  // requests instantly rather than up to `debounce`ms later.
  useEffect(() => {
    if (clearWatchInput.trim().length > 0) return
    latestRequestId.current += 1
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting to a known-clean state in response to the query being cleared, not an anti-pattern derivation
    setSuggestions([])
    setIsFetching(false)
    setError(null)
  }, [clearWatchInput])

  useEffect(() => {
    const trimmed = input.trim()
    if (!placesLibrary || trimmed.length === 0) return

    const requestId = ++latestRequestId.current
    const sessionToken = ensureSessionToken()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- new fetch cycle in response to a real dependency change
    setIsFetching(true)
    setError(null)

    placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: trimmed,
      sessionToken: sessionToken ?? undefined,
      includedRegionCodes: countryCode ? [countryCode] : undefined,
      includedPrimaryTypes: stableIncludedPrimaryTypes,
      locationRestriction: locationRestriction ?? undefined,
    })
      .then(({ suggestions: results }) => {
        if (requestId !== latestRequestId.current) return // superseded by a newer query
        setSuggestions(results.filter((s): s is Suggestion => !!s.placePrediction))
        setIsFetching(false)
      })
      .catch(() => {
        if (requestId !== latestRequestId.current) return
        setIsFetching(false)
        setError("Couldn't load suggestions — try again.")
      })
  }, [input, placesLibrary, countryCode, ensureSessionToken, stableIncludedPrimaryTypes, locationRestriction])

  const selectSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      if (isSelecting) return // no overlapping selections — prevents racing and a wrongly-attributed session token reset
      setIsSelecting(true)
      setError(null)
      try {
        const place = suggestion.placePrediction.toPlace()
        const { place: fetchedPlace } = await place.fetchFields({
          fields: ['id', 'formattedAddress', 'addressComponents', 'location', 'viewport', 'types'],
        })

        if (!fetchedPlace.location) {
          setError("Couldn't get details for that place — try another result.")
          return
        }

        const addressFields = fromPlacesAddressComponents(
          fetchedPlace.addressComponents ?? [],
          fetchedPlace.id,
          defaultCountry,
        )
        const value: LocationValue = {
          ...addressFields,
          coordinates: toCoordinatesTuple({ lat: fetchedPlace.location.lat(), lng: fetchedPlace.location.lng() }),
        }
        onSelected(value)
        onSelectedDetails?.({ value, types: fetchedPlace.types ?? [], viewport: fetchedPlace.viewport ?? null })
        setSuggestions([])
      } catch {
        setError("Couldn't get details for that place — try again.")
      } finally {
        // Minted in `finally`, not only on success — a failed fetchFields()
        // must not leave a used-up session token lingering for the next search.
        sessionTokenRef.current = null
        setIsSelecting(false)
      }
    },
    [isSelecting, defaultCountry, onSelected, onSelectedDetails],
  )

  return {
    suggestions,
    isFetching,
    isSelecting,
    isLibraryReady: !!placesLibrary,
    error,
    selectSuggestion,
  }
}
