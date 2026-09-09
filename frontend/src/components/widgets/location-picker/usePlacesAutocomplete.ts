import { useCallback, useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { fromPlacesAddressComponents, toCoordinatesTuple } from './location.utils'
import type { LocationValue } from '@/types/location.types'

export interface Suggestion {
  placePrediction: google.maps.places.PlacePrediction
}

interface UsePlacesAutocompleteOptions {
  input: string
  /** Raw, un-debounced query, used only to detect a cleared box instantly. Falls back to `input` when omitted. */
  rawInput?: string
  countryCode?: string
  defaultCountry?: string
  onSelected: (value: LocationValue) => void
}

// Uses the programmatic Places API (AutocompleteSuggestion + AutocompleteSessionToken),
// not the PlaceAutocompleteElement widget or the legacy Autocomplete class.
export function usePlacesAutocomplete({ input, rawInput, countryCode, defaultCountry, onSelected }: UsePlacesAutocompleteOptions) {
  const clearWatchInput = rawInput ?? input
  const placesLibrary = useMapsLibrary('places')

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
  }, [input, placesLibrary, countryCode, ensureSessionToken])

  const selectSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      if (isSelecting) return // no overlapping selections — prevents racing and a wrongly-attributed session token reset
      setIsSelecting(true)
      setError(null)
      try {
        const place = suggestion.placePrediction.toPlace()
        const { place: fetchedPlace } = await place.fetchFields({
          fields: ['id', 'formattedAddress', 'addressComponents', 'location'],
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
        onSelected({
          ...addressFields,
          coordinates: toCoordinatesTuple({ lat: fetchedPlace.location.lat(), lng: fetchedPlace.location.lng() }),
        })
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
    [isSelecting, defaultCountry, onSelected],
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
