import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { LocationValue } from '@qms/core'
import { fromPlacesAddressComponents, toCoordinatesTuple } from './location.utils'

export interface Suggestion {
  placePrediction: google.maps.places.PlacePrediction
}

export interface SelectedPlaceDetails {
  value: LocationValue
  /** Raw place types — lets a caller validate the selection is the kind of place it expected. */
  types: string[]
  viewport: google.maps.LatLngBounds | null
}

interface UsePlacesAutocompleteOptions {
  input: string
  /** Un-debounced, to detect a cleared box instantly. Falls back to `input` when omitted. */
  rawInput?: string
  countryCode?: string
  defaultCountry?: string
  /** Restricts predictions to these primary types (e.g. ['locality'] for cities). */
  includedPrimaryTypes?: string[]
  /** Restricts predictions to this bounds (e.g. a selected state's viewport) — resolve a place id to one first. */
  locationRestriction?: google.maps.places.LocationRestriction | null
  onSelected: (value: LocationValue) => void
  /** Parallel to onSelected, also carrying raw types/viewport. Optional so LocationSearchBox is unaffected. */
  onSelectedDetails?: (details: SelectedPlaceDetails) => void
}

// Uses the programmatic Places API, not the PlaceAutocompleteElement widget or legacy Autocomplete class.
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

  // Callers pass array literals inline on every render — stabilize by content so the fetch
  // effect below doesn't retrigger in an infinite loop off a fresh reference each time.
  const includedPrimaryTypesKey = includedPrimaryTypes?.join(',') ?? ''
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed by includedPrimaryTypesKey, not the array reference
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

  // Watches the raw query, not debounced, so a clear invalidates in-flight requests instantly.
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
      if (isSelecting) return // no overlapping selections — prevents a wrongly-attributed session token reset
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
