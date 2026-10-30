import { useEffect, useId, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { Input } from '../primitives/Input'
import type { LocationValue } from '@qms/core'
import { useDebouncedValue } from './useDebouncedValue'
import { useAsyncPickerState } from './useAsyncPickerState'
import { usePlacesAutocomplete, type Suggestion } from './usePlacesAutocomplete'

interface LocationSearchBoxProps {
  disabled?: boolean
  countryCode?: string
  defaultCountry?: string
  onSelected: (value: LocationValue) => void
  /** A caller gating Save on resolution state should treat `true` the same as geocode 'loading'. */
  onSelectingStateChange?: (isSelecting: boolean) => void
}

const suggestionLabel = (suggestion: Suggestion) => suggestion.placePrediction.text.text

const LocationSearchBox = ({ disabled, countryCode, defaultCountry, onSelected, onSelectingStateChange }: LocationSearchBoxProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { open, setOpen, containerRef } = useAsyncPickerState()
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const listboxId = useId()

  const { suggestions, isFetching, isSelecting, isLibraryReady, error, selectSuggestion } = usePlacesAutocomplete({
    input: debouncedQuery,
    rawInput: query,
    countryCode,
    defaultCountry,
    onSelected: (value) => {
      onSelected(value)
      setQuery('')
      setOpen(false)
      setHighlightedIndex(-1)
    },
  })

  useEffect(() => {
    onSelectingStateChange?.(isSelecting)
  }, [isSelecting, onSelectingStateChange])

  // Raw query, not debounced — else clearing the box leaves stale suggestions open until the debounce elapses.
  const hasQuery = query.trim().length > 0
  const showDropdown = open && !disabled && (hasQuery || isFetching)

  // Clamped at read-time — the suggestion list can shrink out from under a stored index.
  const clampedHighlightedIndex = suggestions.length === 0 ? -1 : Math.min(highlightedIndex, suggestions.length - 1)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = suggestions[clampedHighlightedIndex] ?? suggestions[0]
      if (target && !isSelecting) void selectSuggestion(target)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setHighlightedIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
        <Input
          type="text"
          role="combobox"
          aria-label="Search for a location"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={clampedHighlightedIndex >= 0 ? `${listboxId}-option-${clampedHighlightedIndex}` : undefined}
          value={query}
          onChange={(e) => {
            if (isSelecting) return
            setQuery(e.target.value)
            setOpen(true)
            setHighlightedIndex(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for a location..."
          className="pl-8"
          disabled={disabled || isSelecting}
        />
      </div>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 max-h-64 overflow-y-auto"
        >
          {!isLibraryReady && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Loading search…</div>
          )}
          {isLibraryReady && isFetching && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Searching…</div>
          )}
          {isLibraryReady && !isFetching && error && (
            <div className="text-[12px] px-2 py-2 text-danger">{error}</div>
          )}
          {isLibraryReady && !isFetching && !error && hasQuery && suggestions.length === 0 && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>No matching places found.</div>
          )}
          {isLibraryReady && !isFetching && !error && suggestions.map((suggestion, i) => (
            <button
              key={suggestion.placePrediction.placeId}
              id={`${listboxId}-option-${i}`}
              role="option"
              aria-selected={i === clampedHighlightedIndex}
              type="button"
              disabled={isSelecting}
              onMouseEnter={() => setHighlightedIndex(i)}
              onClick={() => { if (!isSelecting) void selectSuggestion(suggestion) }}
              className="w-full flex items-center gap-2 text-left text-[13px] px-2 py-1.5 rounded-md transition-colors disabled:opacity-60"
              style={{
                color: 'var(--qms-text)',
                background: i === clampedHighlightedIndex ? 'var(--qms-surface-hover)' : 'transparent',
              }}
            >
              {suggestionLabel(suggestion)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LocationSearchBox
