import { StrictMode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { APIProviderContext } from '@vis.gl/react-google-maps'
import StateCityFilter from './StateCityFilter'

const fetchAutocompleteSuggestions = vi.fn()
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately loose: stands in for google.maps.places.PlacesLibrary | null across tests
let useMapsLibraryMock: (...args: unknown[]) => any
let apiLoadingStatusMock: string = 'LOADED'
// Whether a provider context is present at all — false simulates no APIProvider ancestor
// (GoogleMapsProvider didn't mount, e.g. no API key), distinct from a mounted-but-loading one.
let hasProviderContextMock = true

vi.mock('@vis.gl/react-google-maps', async () => {
  const { createContext } = await import('react')
  const MockAPIProviderContext = createContext<unknown>(null)
  return {
    useMapsLibrary: (...args: unknown[]) => useMapsLibraryMock(...args),
    useApiLoadingStatus: () => apiLoadingStatusMock,
    APIProviderContext: MockAPIProviderContext,
    APILoadingStatus: { NOT_LOADED: 'NOT_LOADED', LOADING: 'LOADING', LOADED: 'LOADED', FAILED: 'FAILED', AUTH_FAILURE: 'AUTH_FAILURE' },
  }
})

// Wraps every render in the same context-presence toggle the real GoogleMapsProvider controls.
function renderFilter(ui: React.ReactElement) {
  return render(
    <APIProviderContext.Provider value={hasProviderContextMock ? ({} as never) : null}>{ui}</APIProviderContext.Provider>,
  )
}

function makePrediction(placeId: string, text: string, fetchFieldsResult: unknown) {
  return {
    placeId,
    text: { text, toString: () => text },
    toPlace: () => ({
      fetchFields: vi.fn(() =>
        fetchFieldsResult instanceof Error ? Promise.reject(fetchFieldsResult) : Promise.resolve(fetchFieldsResult),
      ),
    }),
  }
}

function makeStateResult(placeId: string, name: string, viewport: unknown = { toString: () => 'vp' }) {
  return {
    placePrediction: makePrediction(placeId, `${name}, India`, {
      place: {
        id: placeId,
        addressComponents: [{ longText: name, shortText: name, types: ['administrative_area_level_1'] }],
        location: { lat: () => 19.7, lng: () => 75.7 },
        viewport,
        types: ['administrative_area_level_1', 'political'],
      },
    }),
  }
}

function makeNonStateResult(placeId: string, name: string) {
  return {
    placePrediction: makePrediction(placeId, name, {
      place: {
        id: placeId,
        addressComponents: [{ longText: name, shortText: name, types: ['locality'] }],
        location: { lat: () => 19.7, lng: () => 75.7 },
        viewport: null,
        types: ['locality', 'political'],
      },
    }),
  }
}

function makeCityResult(placeId: string, name: string) {
  return {
    placePrediction: makePrediction(placeId, `${name}, Maharashtra, India`, {
      place: {
        id: placeId,
        addressComponents: [{ longText: name, shortText: name, types: ['locality'] }],
        location: { lat: () => 18.5, lng: () => 73.8 },
        viewport: null,
        types: ['locality', 'political'],
      },
    }),
  }
}

function makePlacesLibrary() {
  return {
    AutocompleteSuggestion: { fetchAutocompleteSuggestions },
    AutocompleteSessionToken: vi.fn(function (this: object) {
      return this
    }),
  }
}

// Route by the request's `input` text so any number of intermediate debounced calls resolve
// sensibly, instead of a mockResolvedValueOnce queue needing an exact predicted call count.
function routeSuggestionsByInput(byInput: Record<string, unknown[]>) {
  fetchAutocompleteSuggestions.mockImplementation((req: { input: string }) => {
    const suggestions = byInput[req.input] ?? []
    return Promise.resolve({ suggestions })
  })
}

describe('StateCityFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const stableLibrary = makePlacesLibrary()
    useMapsLibraryMock = vi.fn(() => stableLibrary)
    apiLoadingStatusMock = 'LOADED'
    hasProviderContextMock = true
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [] })
  })

  it('City is disabled/empty with no State selected', () => {
    renderFilter(<StateCityFilter city="" state="" onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /filter by city/i })).toBeDisabled()
  })

  it('picking a valid State enables City search restricted to its viewport', async () => {
    const viewport = { toString: () => 'maharashtra-viewport' }
    routeSuggestionsByInput({ Maha: [makeStateResult('s1', 'Maharashtra', viewport)] })
    const onChange = vi.fn()
    const user = userEvent.setup()

    renderFilter(<StateCityFilter city="" state="" onChange={onChange} />)
    const stateInput = screen.getByRole('combobox', { name: /filter by state/i })
    await user.type(stateInput, 'Maha')

    await waitFor(() => expect(screen.getByRole('option', { name: /maharashtra/i })).toBeInTheDocument())
    await user.keyboard('{ArrowDown}{Enter}')

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ city: '', state: 'Maharashtra' }))
    const cityInput = screen.getByRole('combobox', { name: /filter by city/i })
    await waitFor(() => expect(cityInput).toBeEnabled())

    await user.type(cityInput, 'Pune')

    await waitFor(() =>
      expect(fetchAutocompleteSuggestions).toHaveBeenLastCalledWith(
        expect.objectContaining({ locationRestriction: viewport, includedPrimaryTypes: ['locality'] }),
      ),
    )
  })

  it('a selection whose types do NOT include administrative_area_level_1 is rejected, not silently accepted', async () => {
    routeSuggestionsByInput({ Some: [makeNonStateResult('r1', 'Some District')] })
    const onChange = vi.fn()
    const user = userEvent.setup()

    renderFilter(<StateCityFilter city="" state="" onChange={onChange} />)
    await user.type(screen.getByRole('combobox', { name: /filter by state/i }), 'Some')

    await waitFor(() => expect(screen.getByRole('option', { name: /some district/i })).toBeInTheDocument())
    await user.keyboard('{ArrowDown}{Enter}')

    await waitFor(() => expect(screen.getByText(/isn't a state/i)).toBeInTheDocument())
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: /filter by city/i })).toBeDisabled()
  })

  it('editing the State box away from the committed selection clears state, city, and the cached viewport', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    renderFilter(<StateCityFilter city="Pune" state="Maharashtra" onChange={onChange} />)
    const stateInput = screen.getByRole('combobox', { name: /filter by state/i })

    await user.clear(stateInput)
    await user.type(stateInput, 'Guj')

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ city: '', state: '' }))
    expect(screen.getByRole('combobox', { name: /filter by city/i })).toBeDisabled()
  })

  it('editing the City box away from its committed selection clears the committed city value', async () => {
    routeSuggestionsByInput({ Maharashtra: [makeStateResult('s1', 'Maharashtra')] })
    const onChange = vi.fn()
    const user = userEvent.setup()

    // Seed both state AND city via externalStateSeed/externalCitySeed (not just props) so City
    // actually gets a real committed value + viewport to edit away from.
    renderFilter(
      <StateCityFilter
        city=""
        state=""
        onChange={onChange}
        externalStateSeed="Maharashtra"
        externalCitySeed="Pune"
      />,
    )
    const cityInput = await screen.findByRole('combobox', { name: /filter by city/i })
    await waitFor(() => expect(cityInput).toHaveValue('Pune'))
    expect(cityInput).toBeEnabled()
    onChange.mockClear()

    await user.clear(cityInput)
    await user.type(cityInput, 'Nag')

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ city: '', state: 'Maharashtra' }))
  })

  it('keyboard nav (ArrowDown/Enter) selects a state suggestion', async () => {
    routeSuggestionsByInput({ Ma: [makeStateResult('s1', 'Maharashtra'), makeStateResult('s2', 'Madhya Pradesh')] })
    const onChange = vi.fn()
    const user = userEvent.setup()

    renderFilter(<StateCityFilter city="" state="" onChange={onChange} />)
    const stateInput = screen.getByRole('combobox', { name: /filter by state/i })
    await user.type(stateInput, 'Ma')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2))

    await user.keyboard('{ArrowDown}{Enter}')

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ city: '', state: 'Maharashtra' }))
  })

  it('Escape closes the dropdown without selecting', async () => {
    routeSuggestionsByInput({ Maha: [makeStateResult('s1', 'Maharashtra')] })
    const onChange = vi.fn()
    const user = userEvent.setup()

    renderFilter(<StateCityFilter city="" state="" onChange={onChange} />)
    const stateInput = screen.getByRole('combobox', { name: /filter by state/i })
    await user.type(stateInput, 'Maha')
    await waitFor(() => expect(screen.getByRole('option', { name: /maharashtra/i })).toBeInTheDocument())

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('option', { name: /maharashtra/i })).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('remounting via a fresh key clears internal text/selection (the Reset mechanism)', () => {
    const { rerender } = renderFilter(<StateCityFilter key="a" city="Pune" state="Maharashtra" onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /filter by state/i })).toHaveValue('Maharashtra')

    rerender(<StateCityFilter key="b" city="" state="" onChange={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: /filter by state/i })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: /filter by city/i })).toBeDisabled()
  })

  describe('externalStateSeed / externalCitySeed', () => {
    it('resolves an exact match, populates state+city, and enables City', async () => {
      routeSuggestionsByInput({ Maharashtra: [makeStateResult('s1', 'Maharashtra')] })
      const onChange = vi.fn()

      renderFilter(<StateCityFilter city="" state="" onChange={onChange} externalStateSeed="Maharashtra" externalCitySeed="Pune" />)

      await waitFor(() => expect(onChange).toHaveBeenCalledWith({ city: 'Pune', state: 'Maharashtra' }))
      expect(screen.getByRole('combobox', { name: /filter by state/i })).toHaveValue('Maharashtra')
      expect(screen.getByRole('combobox', { name: /filter by city/i })).toBeEnabled()
    })

    it('a seed with only a near-miss candidate (not an exact match) fails loudly — no auto-select, visible error', async () => {
      routeSuggestionsByInput({ Maharashtra: [makeStateResult('s1', 'Madhya Pradesh')] })
      const onChange = vi.fn()

      renderFilter(<StateCityFilter city="" state="" onChange={onChange} externalStateSeed="Maharashtra" />)

      await waitFor(() => expect(screen.getByText(/couldn't find a match for "maharashtra"/i)).toBeInTheDocument())
      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByRole('combobox', { name: /filter by city/i })).toBeDisabled()
    })

    it('a seed with zero results also fails loudly with the same visible error', async () => {
      const onChange = vi.fn()

      renderFilter(<StateCityFilter city="" state="" onChange={onChange} externalStateSeed="Nowhereland" />)

      await waitFor(() => expect(screen.getByText(/couldn't find a match for "nowhereland"/i)).toBeInTheDocument())
      expect(onChange).not.toHaveBeenCalled()
    })

    it('resolves correctly under StrictMode\'s mount->effect->cleanup->effect double-invoke, not left stuck disabled', async () => {
      routeSuggestionsByInput({ Maharashtra: [makeStateResult('s1', 'Maharashtra')] })
      const onChange = vi.fn()

      renderFilter(
        <StrictMode>
          <StateCityFilter city="" state="" onChange={onChange} externalStateSeed="Maharashtra" externalCitySeed="Pune" />
        </StrictMode>,
      )

      await waitFor(() => expect(onChange).toHaveBeenCalledWith({ city: 'Pune', state: 'Maharashtra' }))
      expect(screen.getByRole('combobox', { name: /filter by state/i })).toBeEnabled()
      expect(screen.getByRole('combobox', { name: /filter by city/i })).toBeEnabled()
    })
  })

  it('scopes City search to the (cities) type collection', async () => {
    routeSuggestionsByInput({
      Maha: [makeStateResult('s1', 'Maharashtra')],
      Pun: [makeCityResult('c1', 'Pune')],
    })
    const onChange = vi.fn()
    const user = userEvent.setup()

    renderFilter(<StateCityFilter city="" state="" onChange={onChange} />)
    await user.type(screen.getByRole('combobox', { name: /filter by state/i }), 'Maha')
    await waitFor(() => expect(screen.getByRole('option', { name: /maharashtra/i })).toBeInTheDocument())
    await user.keyboard('{ArrowDown}{Enter}')

    const cityInput = await screen.findByRole('combobox', { name: /filter by city/i })
    await waitFor(() => expect(cityInput).toBeEnabled())
    await user.type(cityInput, 'Pun')

    await waitFor(() =>
      expect(fetchAutocompleteSuggestions).toHaveBeenLastCalledWith(
        expect.objectContaining({ includedPrimaryTypes: ['locality'] }),
      ),
    )
  })

  describe('Maps unavailable (no APIProvider ancestor, or SDK failed to load)', () => {
    it('falls back to plain, always-enabled text inputs instead of a combobox — no false "No matching states found."', () => {
      useMapsLibraryMock = () => null
      apiLoadingStatusMock = 'NOT_LOADED'
      hasProviderContextMock = false
      const onChange = vi.fn()

      renderFilter(<StateCityFilter city="" state="" onChange={onChange} />)

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      const stateInput = screen.getByRole('textbox', { name: /filter by state/i })
      const cityInput = screen.getByRole('textbox', { name: /filter by city/i })
      expect(stateInput).toBeEnabled()
      expect(cityInput).toBeEnabled()
      expect(screen.getByText(/map search is unavailable/i)).toBeInTheDocument()
    })

    it('typing into the fallback inputs commits plain city/state values directly', async () => {
      useMapsLibraryMock = () => null
      apiLoadingStatusMock = 'FAILED'
      const onChange = vi.fn()
      const user = userEvent.setup()

      renderFilter(<StateCityFilter city="" state="" onChange={onChange} />)
      await user.type(screen.getByRole('textbox', { name: /filter by state/i }), 'Maharashtra')
      await user.type(screen.getByRole('textbox', { name: /filter by city/i }), 'Pune')

      expect(onChange).toHaveBeenLastCalledWith({ city: 'Pune', state: 'Maharashtra' })
    })

    it('an externalStateSeed never leaves the fallback stuck disabled — resolves out of "resolving" immediately', () => {
      useMapsLibraryMock = () => null
      apiLoadingStatusMock = 'NOT_LOADED'
      hasProviderContextMock = false

      renderFilter(<StateCityFilter city="" state="" onChange={vi.fn()} externalStateSeed="Maharashtra" />)

      expect(screen.getByRole('textbox', { name: /filter by state/i })).toBeEnabled()
      expect(screen.getByRole('textbox', { name: /filter by city/i })).toBeEnabled()
    })
  })

  describe('Maps still loading (a real APIProvider is mounted, SDK not ready yet)', () => {
    it('shows a disabled "Loading map search..." state, NOT the unavailable fallback, while a mounting provider reports NOT_LOADED', () => {
      useMapsLibraryMock = () => null
      apiLoadingStatusMock = 'NOT_LOADED'
      hasProviderContextMock = true

      renderFilter(<StateCityFilter city="" state="" onChange={vi.fn()} />)

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      expect(screen.queryByText(/map search is unavailable/i)).not.toBeInTheDocument()
      const inputs = screen.getAllByPlaceholderText(/loading map search/i)
      expect(inputs).toHaveLength(2)
      inputs.forEach((input) => expect(input).toBeDisabled())
    })

    it('same disabled loading state while a mounted provider reports LOADING', () => {
      useMapsLibraryMock = () => null
      apiLoadingStatusMock = 'LOADING'
      hasProviderContextMock = true

      renderFilter(<StateCityFilter city="" state="" onChange={vi.fn()} />)

      expect(screen.getAllByPlaceholderText(/loading map search/i)).toHaveLength(2)
    })
  })
})
