import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePlacesAutocomplete, type Suggestion } from './usePlacesAutocomplete'

const fetchAutocompleteSuggestions = vi.fn()
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately loose: stands in for google.maps.places.PlacesLibrary | null across tests
let useMapsLibraryMock: (...args: unknown[]) => any

vi.mock('@vis.gl/react-google-maps', () => ({
  useMapsLibrary: (...args: unknown[]) => useMapsLibraryMock(...args),
}))

// Deliberately partial — only the fields the code under test actually reads
// off PlacePrediction/Place; cast to the real type rather than widening it.
function makeSuggestion(placeId: string, text: string, fetchFieldsResult?: unknown): Suggestion {
  return {
    placePrediction: {
      placeId,
      text: { text, toString: () => text },
      toPlace: () => ({
        fetchFields: fetchFieldsResult
          ? vi.fn(() => (fetchFieldsResult instanceof Error ? Promise.reject(fetchFieldsResult) : Promise.resolve(fetchFieldsResult)))
          : vi.fn(() =>
              Promise.resolve({
                place: {
                  id: placeId,
                  addressComponents: [],
                  location: { lat: () => 28.6129, lng: () => 77.2295 },
                },
              }),
            ),
      }),
    },
  } as unknown as Suggestion
}

function makePlacesLibrary() {
  return {
    AutocompleteSuggestion: { fetchAutocompleteSuggestions },
    AutocompleteSessionToken: vi.fn(function (this: object) {
      return this
    }),
  }
}

describe('usePlacesAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // A stable reference across renders — the real useMapsLibrary caches the
    // loaded library and returns the SAME object every render (it only
    // changes if the library genuinely reloads), so a fresh object literal
    // per call here would be an unrealistic mock, not a faithful stand-in.
    const stableLibrary = makePlacesLibrary()
    useMapsLibraryMock = vi.fn(() => stableLibrary)
  })

  it('does not fetch while the places library is still loading (useMapsLibrary returns null)', () => {
    useMapsLibraryMock = vi.fn(() => null)
    renderHook(() => usePlacesAutocomplete({ input: 'Mumbai', onSelected: vi.fn() }))
    expect(fetchAutocompleteSuggestions).not.toHaveBeenCalled()
  })

  it('reports isLibraryReady correctly', () => {
    useMapsLibraryMock = vi.fn(() => null)
    const { result, rerender } = renderHook(() => usePlacesAutocomplete({ input: '', onSelected: vi.fn() }))
    expect(result.current.isLibraryReady).toBe(false)

    useMapsLibraryMock = vi.fn(() => makePlacesLibrary())
    rerender()
    expect(result.current.isLibraryReady).toBe(true)
  })

  it('fetches suggestions once the library is ready and input is non-empty', async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [makeSuggestion('p1', 'Mumbai, India')] })
    const { result } = renderHook(() => usePlacesAutocomplete({ input: 'Mumbai', onSelected: vi.fn() }))

    await waitFor(() => expect(result.current.suggestions).toHaveLength(1))
    expect(fetchAutocompleteSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({ input: 'Mumbai' }),
    )
  })

  it('a slower response for an earlier, now-stale query never overwrites a later query\'s results', async () => {
    let resolveFirst!: (v: unknown) => void
    fetchAutocompleteSuggestions
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockResolvedValueOnce({ suggestions: [makeSuggestion('p2', 'Mumbai Central')] })

    const { result, rerender } = renderHook(
      ({ input }) => usePlacesAutocomplete({ input, onSelected: vi.fn() }),
      { initialProps: { input: 'Mumbai' } },
    )
    rerender({ input: 'Mumbai Central' })

    await waitFor(() => expect(result.current.suggestions).toHaveLength(1))
    expect(result.current.suggestions[0].placePrediction.placeId).toBe('p2')

    // The first (stale) request resolves AFTER the second — must not win.
    resolveFirst({ suggestions: [makeSuggestion('p1', 'Mumbai')] })
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current.suggestions).toHaveLength(1)
    expect(result.current.suggestions[0].placePrediction.placeId).toBe('p2')
  })

  it('clearing the query immediately invalidates in-flight requests and clears suggestions synchronously', async () => {
    let resolveFetch!: (v: unknown) => void
    fetchAutocompleteSuggestions.mockImplementationOnce(() => new Promise((resolve) => { resolveFetch = resolve }))

    const { result, rerender } = renderHook(
      ({ input }) => usePlacesAutocomplete({ input, onSelected: vi.fn() }),
      { initialProps: { input: 'Mumbai' } },
    )
    await waitFor(() => expect(result.current.isFetching).toBe(true))

    rerender({ input: '' })
    expect(result.current.suggestions).toHaveLength(0)
    expect(result.current.isFetching).toBe(false)

    // The now-cleared query's in-flight fetch resolving late must not reopen anything.
    resolveFetch({ suggestions: [makeSuggestion('p1', 'Mumbai')] })
    await new Promise((r) => setTimeout(r, 10))
    expect(result.current.suggestions).toHaveLength(0)
  })

  it('selecting a suggestion fires onSelected with the resolved LocationValue', async () => {
    const onSelected = vi.fn()
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [] })
    const { result } = renderHook(() => usePlacesAutocomplete({ input: '', onSelected, defaultCountry: 'India' }))

    const suggestion = makeSuggestion('p1', 'Mumbai, India')
    await act(async () => {
      await result.current.selectSuggestion(suggestion)
    })

    expect(onSelected).toHaveBeenCalledWith(
      expect.objectContaining({ coordinates: [77.2295, 28.6129], googlePlaceId: 'p1' }),
    )
  })

  it('mints the next session token in a finally block even when fetchFields() rejects', async () => {
    const sessionTokenCtor = vi.fn(function (this: object) { return this })
    const stableLibrary = {
      AutocompleteSuggestion: { fetchAutocompleteSuggestions },
      AutocompleteSessionToken: sessionTokenCtor,
    }
    useMapsLibraryMock = vi.fn(() => stableLibrary)
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [] })

    const { result, rerender } = renderHook(
      ({ input }) => usePlacesAutocomplete({ input, onSelected: vi.fn() }),
      { initialProps: { input: 'Mumbai' } },
    )
    await waitFor(() => expect(sessionTokenCtor).toHaveBeenCalledTimes(1)) // minted once for the search itself

    const failingSuggestion = makeSuggestion('p1', 'Mumbai', new Error('fetchFields failed'))
    await act(async () => {
      await result.current.selectSuggestion(failingSuggestion)
    })
    expect(result.current.error).toBeTruthy()

    // Triggering a new search (as if the user kept typing) must mint a FRESH
    // token — proving the old one was discarded in `finally` despite the
    // rejection, not left lingering for reuse (which would invalidate billing).
    rerender({ input: 'Mumbai Central' })
    await waitFor(() => expect(sessionTokenCtor).toHaveBeenCalledTimes(2))
  })

  it('ignores a second selection attempt while the first is still in flight', async () => {
    const onSelected = vi.fn()
    let resolveFetchFields!: (v: { place: unknown }) => void
    const pendingFetchFields = new Promise<{ place: unknown }>((resolve) => { resolveFetchFields = resolve })
    const suggestion = makeSuggestion('p1', 'Mumbai')
    ;(suggestion.placePrediction as unknown as { toPlace: () => { fetchFields: () => Promise<{ place: unknown }> } }).toPlace = () => ({
      fetchFields: vi.fn(() => pendingFetchFields),
    })

    const { result } = renderHook(() => usePlacesAutocomplete({ input: '', onSelected }))

    let firstSelectionPromise!: Promise<void>
    act(() => {
      firstSelectionPromise = result.current.selectSuggestion(suggestion)
    })
    expect(result.current.isSelecting).toBe(true)

    // Second attempt while the first is still pending — must be a no-op.
    await act(async () => {
      await result.current.selectSuggestion(suggestion)
    })
    expect(onSelected).not.toHaveBeenCalled()

    resolveFetchFields({
      place: { id: 'p1', addressComponents: [], location: { lat: () => 1, lng: () => 2 } },
    })
    await act(async () => {
      await firstSelectionPromise
    })
    expect(onSelected).toHaveBeenCalledTimes(1)
  })
})
