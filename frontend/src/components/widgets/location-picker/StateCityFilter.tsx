import { useContext, useEffect, useId, useRef, useState } from 'react'
import { FiMapPin } from 'react-icons/fi'
import { useApiLoadingStatus, useMapsLibrary, APILoadingStatus, APIProviderContext } from '@vis.gl/react-google-maps'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { usePlacesAutocomplete, type Suggestion, type SelectedPlaceDetails } from './usePlacesAutocomplete'

// State -> City filter combobox pair: City is inert until a validated State is selected, and
// editing either box's text away from its committed selection clears that selection immediately.
// Local text seeds from props only at mount — caller remounts via `key` to reset externally.

const STATE_TYPE = 'administrative_area_level_1'

interface StateCityFilterProps {
  city: string
  state: string
  onChange: (next: { city: string; state: string }) => void
  /** Programmatic seed, resolved via its own Places search on mount (exact match required).
   * Pass a fresh `key` alongside a new seed so this component remounts and re-resolves. */
  externalStateSeed?: string
  externalCitySeed?: string
}

const suggestionLabel = (suggestion: Suggestion) => suggestion.placePrediction.text.text

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

type SeedState = { status: 'idle' } | { status: 'resolving' } | { status: 'error'; message: string }

const StateCityFilter = ({ city, state, onChange, externalStateSeed, externalCitySeed }: StateCityFilterProps) => {
  const [stateQuery, setStateQuery] = useState(state)
  const [cityQuery, setCityQuery] = useState(city)
  const [stateViewport, setStateViewport] = useState<google.maps.LatLngBounds | null>(null)
  const [stateError, setStateError] = useState<string | null>(null)

  // Tracks what THIS component last committed — not the city/state props, which can lag a render
  // behind a slow (or, in tests, non-reactive) parent and would make clear-on-edit silently no-op.
  const committedRef = useRef({ city, state })
  const commit = (next: { city: string; state: string }) => {
    committedRef.current = next
    onChange(next)
  }

  const debouncedStateQuery = useDebouncedValue(stateQuery, 300)
  const debouncedCityQuery = useDebouncedValue(cityQuery, 300)
  const stateListboxId = useId()
  const cityListboxId = useId()

  const { open: stateOpen, setOpen: setStateOpen, containerRef: stateContainerRef } = useAsyncPickerState()
  const { open: cityOpen, setOpen: setCityOpen, containerRef: cityContainerRef } = useAsyncPickerState()
  const [stateHighlighted, setStateHighlighted] = useState(-1)
  const [cityHighlighted, setCityHighlighted] = useState(-1)
  const placesLibrary = useMapsLibrary('places')
  const apiLoadingStatus = useApiLoadingStatus()
  // A mounting APIProvider also reports NOT_LOADED briefly — only an absent context or a
  // confirmed FAILED/AUTH_FAILURE means genuinely unavailable, not NOT_LOADED alone.
  const hasProviderContext = useContext(APIProviderContext) !== null
  const isLoadingSdk = hasProviderContext && !placesLibrary && apiLoadingStatus !== APILoadingStatus.FAILED && apiLoadingStatus !== APILoadingStatus.AUTH_FAILURE
  const mapsUnavailable =
    !placesLibrary &&
    (!hasProviderContext || apiLoadingStatus === APILoadingStatus.FAILED || apiLoadingStatus === APILoadingStatus.AUTH_FAILURE)

  // Resolution is a genuine external-system call (a network request), so it belongs in an effect —
  // fired once per mount (this component is remounted via the caller's `key` for a fresh seed).
  const [seed, setSeed] = useState<SeedState>(externalStateSeed ? { status: 'resolving' } : { status: 'idle' })
  const seedRanRef = useRef(false)

  useEffect(() => {
    if (!externalStateSeed || !placesLibrary || seedRanRef.current) return
    seedRanRef.current = true
    let cancelled = false

    void (async () => {
      try {
        const { suggestions: results } = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: externalStateSeed,
          includedPrimaryTypes: [STATE_TYPE],
          includedRegionCodes: ['in'],
        })
        for (const result of results) {
          const prediction = result.placePrediction
          if (!prediction) continue
          const place = prediction.toPlace()
          const { place: fetched } = await place.fetchFields({ fields: ['addressComponents', 'location', 'viewport', 'types'] })
          if (cancelled) return
          if (!fetched.types?.includes(STATE_TYPE)) continue
          const resolvedState = fetched.addressComponents?.find((c) => c.types.includes(STATE_TYPE))?.longText ?? ''
          if (normalize(resolvedState) !== normalize(externalStateSeed)) continue

          setStateQuery(resolvedState)
          setStateViewport(fetched.viewport ?? null)
          const seededCity = externalCitySeed ?? ''
          setCityQuery(seededCity)
          commit({ city: seededCity, state: resolvedState })
          setSeed({ status: 'idle' })
          return
        }
        if (!cancelled) {
          setSeed({ status: 'error', message: `Couldn't find a match for "${externalStateSeed}" — search a state directly.` })
        }
      } catch {
        if (!cancelled) {
          setSeed({ status: 'error', message: `Couldn't find a match for "${externalStateSeed}" — search a state directly.` })
        }
      }
    })()

    return () => {
      cancelled = true
      // Resets so a StrictMode double-invoke restarts fresh instead of permanently blocking
      // retry — without this, run #1's cleanup discards its own success and the ref stays stuck.
      seedRanRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onChange intentionally excluded: this fires once per mount, re-adding it on every parent render must not re-run the seed resolution.
  }, [externalStateSeed, externalCitySeed, placesLibrary])

  // Once Maps is confirmed unavailable, the fallback below renders instead — 'resolving' would
  // otherwise never resolve and leave State/City disabled forever in the combobox UI this gates.
  const isSeeding = seed.status === 'resolving' && !mapsUnavailable

  const {
    suggestions: stateSuggestions,
    isFetching: isStateFetching,
    isSelecting: isStateSelecting,
    error: stateFetchError,
    selectSuggestion: selectStateSuggestion,
  } = usePlacesAutocomplete({
    input: debouncedStateQuery,
    rawInput: stateQuery,
    countryCode: 'in',
    includedPrimaryTypes: [STATE_TYPE],
    onSelected: () => {},
    onSelectedDetails: (details) => acceptStateSelection(details),
  })

  const {
    suggestions: citySuggestions,
    isFetching: isCityFetching,
    isSelecting: isCitySelecting,
    error: cityFetchError,
    selectSuggestion: selectCitySuggestion,
  } = usePlacesAutocomplete({
    input: debouncedCityQuery,
    rawInput: cityQuery,
    countryCode: 'in',
    includedPrimaryTypes: ['locality'],
    locationRestriction: stateViewport,
    onSelected: (value) => {
      const committedCity = value.city || cityQuery.trim()
      setCityQuery(committedCity)
      commit({ city: committedCity, state: committedRef.current.state })
      setCityOpen(false)
      setCityHighlighted(-1)
    },
  })

  function acceptStateSelection(details: SelectedPlaceDetails) {
    if (!details.types.includes(STATE_TYPE)) {
      setStateError("That result isn't a state — pick one from the list.")
      return
    }
    const committedState = details.value.state || stateQuery.trim()
    setStateError(null)
    setStateQuery(committedState)
    setStateViewport(details.viewport)
    // Clearing State invalidates any previously-selected City — a stale city paired with a
    // different/cleared state would be a real inconsistency, not just unpolished UX.
    setCityQuery('')
    commit({ city: '', state: committedState })
    setStateOpen(false)
    setStateHighlighted(-1)
  }

  const handleStateQueryChange = (value: string) => {
    setStateQuery(value)
    setStateOpen(true)
    setStateHighlighted(-1)
    setStateError(null)
    // Typing away from the committed selection clears it (state, dependent city, cached viewport)
    // rather than leaving stale values in effect — compares against committedRef, not the props.
    if (normalize(value) !== normalize(committedRef.current.state)) {
      setStateViewport(null)
      if (committedRef.current.state || committedRef.current.city) commit({ city: '', state: '' })
    }
  }

  const handleCityQueryChange = (value: string) => {
    setCityQuery(value)
    setCityOpen(true)
    setCityHighlighted(-1)
    if (normalize(value) !== normalize(committedRef.current.city) && committedRef.current.city) {
      commit({ city: '', state: committedRef.current.state })
    }
  }

  const stateHasQuery = stateQuery.trim().length > 0
  const showStateDropdown = stateOpen && (stateHasQuery || isStateFetching)
  const clampedStateHighlighted = stateSuggestions.length === 0 ? -1 : Math.min(stateHighlighted, stateSuggestions.length - 1)

  const cityDisabled = !stateViewport
  const cityHasQuery = cityQuery.trim().length > 0
  const showCityDropdown = !cityDisabled && cityOpen && (cityHasQuery || isCityFetching)
  const clampedCityHighlighted = citySuggestions.length === 0 ? -1 : Math.min(cityHighlighted, citySuggestions.length - 1)

  const handleStateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showStateDropdown || stateSuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setStateHighlighted((i) => (i + 1) % stateSuggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setStateHighlighted((i) => (i - 1 + stateSuggestions.length) % stateSuggestions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = stateSuggestions[clampedStateHighlighted] ?? stateSuggestions[0]
      if (target && !isStateSelecting) void selectStateSuggestion(target)
    } else if (e.key === 'Escape') {
      setStateOpen(false)
      setStateHighlighted(-1)
    }
  }

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCityDropdown || citySuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCityHighlighted((i) => (i + 1) % citySuggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCityHighlighted((i) => (i - 1 + citySuggestions.length) % citySuggestions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = citySuggestions[clampedCityHighlighted] ?? citySuggestions[0]
      if (target && !isCitySelecting) void selectCitySuggestion(target)
    } else if (e.key === 'Escape') {
      setCityOpen(false)
      setCityHighlighted(-1)
    }
  }

  // Maps can't load here — degrade to the old plain city/state text inputs rather than falsely
  // showing "No matching states found." for a search that was never actually attempted.
  if (mapsUnavailable) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="text"
          aria-label="Filter by state"
          defaultValue={state}
          onChange={(e) => commit({ city: committedRef.current.city, state: e.target.value })}
          placeholder="State..."
          className="w-32 text-[12px]"
        />
        <Input
          type="text"
          aria-label="Filter by city"
          defaultValue={city}
          onChange={(e) => commit({ city: e.target.value, state: committedRef.current.state })}
          placeholder="City..."
          className="w-32 text-[12px]"
        />
        <p className="text-[11px] w-full" style={{ color: 'var(--qms-text-muted)' }}>
          Map search is unavailable — type a state and city directly.
        </p>
      </div>
    )
  }

  // A real APIProvider is mounted and hasn't failed, but the Places library hasn't finished
  // loading yet — a brief, real state (not "unavailable"), so disable rather than false-error.
  if (isLoadingSdk) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input type="text" aria-label="Filter by state" placeholder="Loading map search..." className="w-32 text-[12px]" disabled />
        <Input type="text" aria-label="Filter by city" placeholder="Loading map search..." className="w-32 text-[12px]" disabled />
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div ref={stateContainerRef} className="relative">
        <Input
          type="text"
          role="combobox"
          aria-label="Filter by state"
          aria-expanded={showStateDropdown}
          aria-controls={stateListboxId}
          value={stateQuery}
          onChange={(e) => handleStateQueryChange(e.target.value)}
          onFocus={() => setStateOpen(true)}
          onKeyDown={handleStateKeyDown}
          placeholder="State..."
          className="w-32 text-[12px]"
          disabled={isSeeding}
        />
        {showStateDropdown && (
          <div
            id={stateListboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 max-h-64 overflow-y-auto w-56"
          >
            {isStateFetching && (
              <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Searching…</div>
            )}
            {!isStateFetching && (stateFetchError || stateError) && (
              <div className="text-[12px] px-2 py-2 text-danger">{stateFetchError || stateError}</div>
            )}
            {!isStateFetching && !stateFetchError && !stateError && stateHasQuery && stateSuggestions.length === 0 && (
              <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>No matching states found.</div>
            )}
            {!isStateFetching && !stateFetchError && stateSuggestions.map((suggestion, i) => (
              <button
                key={suggestion.placePrediction.placeId}
                id={`${stateListboxId}-option-${i}`}
                role="option"
                aria-selected={i === clampedStateHighlighted}
                type="button"
                disabled={isStateSelecting}
                onMouseEnter={() => setStateHighlighted(i)}
                onClick={() => { if (!isStateSelecting) void selectStateSuggestion(suggestion) }}
                className="w-full flex items-center gap-2 text-left text-[12px] px-2 py-1.5 rounded-md transition-colors disabled:opacity-60"
                style={{
                  color: 'var(--qms-text)',
                  background: i === clampedStateHighlighted ? 'var(--qms-surface-hover)' : 'transparent',
                }}
              >
                <FiMapPin size={12} style={{ color: 'var(--qms-text-muted)' }} />
                {suggestionLabel(suggestion)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={cityContainerRef} className="relative">
        <Input
          type="text"
          role="combobox"
          aria-label="Filter by city"
          aria-expanded={showCityDropdown}
          aria-controls={cityListboxId}
          value={cityQuery}
          onChange={(e) => handleCityQueryChange(e.target.value)}
          onFocus={() => { if (!cityDisabled) setCityOpen(true) }}
          onKeyDown={handleCityKeyDown}
          placeholder={cityDisabled ? 'Pick a state first...' : 'City...'}
          className="w-32 text-[12px]"
          disabled={cityDisabled || isSeeding}
        />
        {showCityDropdown && (
          <div
            id={cityListboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 max-h-64 overflow-y-auto w-56"
          >
            {isCityFetching && (
              <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Searching…</div>
            )}
            {!isCityFetching && cityFetchError && (
              <div className="text-[12px] px-2 py-2 text-danger">{cityFetchError}</div>
            )}
            {!isCityFetching && !cityFetchError && cityHasQuery && citySuggestions.length === 0 && (
              <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>No matching cities found.</div>
            )}
            {!isCityFetching && !cityFetchError && citySuggestions.map((suggestion, i) => (
              <button
                key={suggestion.placePrediction.placeId}
                id={`${cityListboxId}-option-${i}`}
                role="option"
                aria-selected={i === clampedCityHighlighted}
                type="button"
                disabled={isCitySelecting}
                onMouseEnter={() => setCityHighlighted(i)}
                onClick={() => { if (!isCitySelecting) void selectCitySuggestion(suggestion) }}
                className="w-full flex items-center gap-2 text-left text-[12px] px-2 py-1.5 rounded-md transition-colors disabled:opacity-60"
                style={{
                  color: 'var(--qms-text)',
                  background: i === clampedCityHighlighted ? 'var(--qms-surface-hover)' : 'transparent',
                }}
              >
                <FiMapPin size={12} style={{ color: 'var(--qms-text-muted)' }} />
                {suggestionLabel(suggestion)}
              </button>
            ))}
          </div>
        )}
      </div>

      {seed.status === 'error' && (
        <p className="text-[11px] text-danger w-full">{seed.message}</p>
      )}
    </div>
  )
}

export default StateCityFilter
