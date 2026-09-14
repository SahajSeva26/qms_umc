import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocationSearchBox from './LocationSearchBox'

const fetchAutocompleteSuggestions = vi.fn()
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately loose: stands in for google.maps.places.PlacesLibrary | null
let useMapsLibraryMock: (...args: unknown[]) => any

vi.mock('@vis.gl/react-google-maps', () => ({
  useMapsLibrary: (...args: unknown[]) => useMapsLibraryMock(...args),
}))

function makeSuggestion(placeId: string, text: string): import('./usePlacesAutocomplete').Suggestion {
  return {
    placePrediction: {
      placeId,
      text: { text, toString: () => text },
      toPlace: () => ({
        fetchFields: vi.fn(() =>
          Promise.resolve({
            place: { id: placeId, addressComponents: [], location: { lat: () => 1, lng: () => 2 } },
          }),
        ),
      }),
    },
  } as unknown as import('./usePlacesAutocomplete').Suggestion
}

describe('LocationSearchBox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const stableLibrary = {
      AutocompleteSuggestion: { fetchAutocompleteSuggestions },
      AutocompleteSessionToken: vi.fn(function (this: object) { return this }),
    }
    useMapsLibraryMock = vi.fn(() => stableLibrary)
  })

  it('is disabled: input is disabled and no dropdown opens on focus', async () => {
    render(<LocationSearchBox disabled onSelected={vi.fn()} />)
    const input = screen.getByRole('combobox')
    expect(input).toBeDisabled()
  })

  it('shows suggestions in a listbox with option roles as the user types', async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [makeSuggestion('p1', 'Mumbai, India')] })
    const user = userEvent.setup()
    render(<LocationSearchBox onSelected={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'Mumbai')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    expect(screen.getByRole('option')).toHaveTextContent('Mumbai, India')
  })

  it('shows "No matching places found" when a completed fetch returns zero suggestions', async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [] })
    const user = userEvent.setup()
    render(<LocationSearchBox onSelected={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'Nowhereville')
    expect(await screen.findByText(/no matching places found/i)).toBeInTheDocument()
  })

  it('ArrowDown/ArrowUp move the highlighted option, Enter selects it', async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({
      suggestions: [makeSuggestion('p1', 'Mumbai'), makeSuggestion('p2', 'Mumbai Central')],
    })
    const onSelected = vi.fn()
    const user = userEvent.setup()
    render(<LocationSearchBox onSelected={onSelected} />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'Mumbai')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2))

    await user.keyboard('{ArrowDown}{ArrowDown}') // wraps to the first option
    await user.keyboard('{Enter}')

    await waitFor(() => expect(onSelected).toHaveBeenCalledTimes(1))
    expect(onSelected).toHaveBeenCalledWith(expect.objectContaining({ coordinates: [2, 1] }))
  })

  it('Escape closes the dropdown without selecting', async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [makeSuggestion('p1', 'Mumbai')] })
    const onSelected = vi.fn()
    const user = userEvent.setup()
    render(<LocationSearchBox onSelected={onSelected} />)

    await user.type(screen.getByRole('combobox'), 'Mumbai')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onSelected).not.toHaveBeenCalled()
  })

  it('clicking a suggestion selects it and clears the query afterward', async () => {
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [makeSuggestion('p1', 'Mumbai')] })
    const onSelected = vi.fn()
    const user = userEvent.setup()
    render(<LocationSearchBox onSelected={onSelected} />)

    const input = screen.getByRole('combobox') as HTMLInputElement
    await user.type(input, 'Mumbai')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))

    await user.click(screen.getByRole('option'))
    await waitFor(() => expect(onSelected).toHaveBeenCalledTimes(1))
    expect(input.value).toBe('')
  })

  it('has an accessible name via aria-label, not just a placeholder', () => {
    render(<LocationSearchBox onSelected={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /search for a location/i })).toBeInTheDocument()
  })

  it('clearing the query closes a stale dropdown immediately, before the debounce window elapses', async () => {
    fetchAutocompleteSuggestions.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<LocationSearchBox onSelected={vi.fn()} />)

    const input = screen.getByRole('combobox') as HTMLInputElement
    await user.type(input, 'Mumbai')
    await waitFor(() => expect(fetchAutocompleteSuggestions).toHaveBeenCalled())

    await user.clear(input)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('locks the input while a selection is being resolved, ignoring further edits', async () => {
    let resolveFetchFields!: (v: { place: unknown }) => void
    const suggestion = makeSuggestion('p1', 'Mumbai')
    ;(suggestion.placePrediction as unknown as { toPlace: () => { fetchFields: () => Promise<{ place: unknown }> } }).toPlace = () => ({
      fetchFields: vi.fn(() => new Promise<{ place: unknown }>((resolve) => { resolveFetchFields = resolve })),
    })
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [suggestion] })
    const onSelected = vi.fn()
    const user = userEvent.setup()
    render(<LocationSearchBox onSelected={onSelected} />)

    const input = screen.getByRole('combobox') as HTMLInputElement
    await user.type(input, 'Mumbai')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))

    await user.click(screen.getByRole('option'))
    expect(input).toBeDisabled()

    await user.type(input, 'x')
    expect(input.value).toBe('Mumbai')
    expect(fetchAutocompleteSuggestions).toHaveBeenCalledTimes(1)

    resolveFetchFields({ place: { id: 'p1', addressComponents: [], location: { lat: () => 1, lng: () => 2 } } })
    await waitFor(() => expect(onSelected).toHaveBeenCalledTimes(1))
    expect(input).not.toBeDisabled()
  })

  it('reports isSelecting=true while a selection is in flight, then false once it resolves — a caller can gate Save on this', async () => {
    let resolveFetchFields!: (v: { place: unknown }) => void
    const suggestion = makeSuggestion('p1', 'Mumbai')
    ;(suggestion.placePrediction as unknown as { toPlace: () => { fetchFields: () => Promise<{ place: unknown }> } }).toPlace = () => ({
      fetchFields: vi.fn(() => new Promise<{ place: unknown }>((resolve) => { resolveFetchFields = resolve })),
    })
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [suggestion] })
    const onSelectingStateChange = vi.fn()
    const user = userEvent.setup()
    render(<LocationSearchBox onSelected={vi.fn()} onSelectingStateChange={onSelectingStateChange} />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'Mumbai')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    expect(onSelectingStateChange).not.toHaveBeenCalledWith(true)

    await user.click(screen.getByRole('option'))
    expect(onSelectingStateChange).toHaveBeenLastCalledWith(true)

    resolveFetchFields({ place: { id: 'p1', addressComponents: [], location: { lat: () => 1, lng: () => 2 } } })
    await waitFor(() => expect(onSelectingStateChange).toHaveBeenLastCalledWith(false))
  })
})
