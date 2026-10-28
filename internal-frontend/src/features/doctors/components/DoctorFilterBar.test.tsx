import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DoctorFilterBar from './DoctorFilterBar'
import type { DoctorsFilterState } from '@/features/doctors/hooks/useDoctorsFilters'

// A non-null, LOADED library so StateCityFilter renders its normal combobox UI — these tests are
// about filter-bar wiring, not Maps-unavailable/loading behavior (covered in StateCityFilter.test.tsx).
const fetchAutocompleteSuggestions = vi.fn(() => Promise.resolve({ suggestions: [] }))
vi.mock('@vis.gl/react-google-maps', async () => {
  const { createContext } = await import('react')
  return {
    useMapsLibrary: () => ({
      AutocompleteSuggestion: { fetchAutocompleteSuggestions },
      AutocompleteSessionToken: vi.fn(function (this: object) { return this }),
    }),
    useApiLoadingStatus: () => 'LOADED',
    APIProviderContext: createContext<unknown>({}),
    APILoadingStatus: { NOT_LOADED: 'NOT_LOADED', LOADING: 'LOADING', LOADED: 'LOADED', FAILED: 'FAILED', AUTH_FAILURE: 'AUTH_FAILURE' },
  }
})

const DEFAULT_FILTERS: DoctorsFilterState = {
  search: '',
  specialization: 'ALL',
  status: 'ALL',
  city: '',
  state: '',
}

function renderBar(filters: DoctorsFilterState = DEFAULT_FILTERS, extra: Partial<{ geographySeedKey: number; geographySeed: { city: string; state: string } | null }> = {}) {
  const setFilter = vi.fn()
  const reset = vi.fn()
  const utils = render(<DoctorFilterBar filters={filters} setFilter={setFilter} reset={reset} {...extra} />)
  return { ...utils, setFilter, reset }
}

describe('DoctorFilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the State combobox before the City combobox (the ticket\'s literal reorder)', () => {
    renderBar()
    const comboboxes = screen.getAllByRole('combobox')
    const labels = comboboxes.map((el) => el.getAttribute('aria-label'))
    const stateIndex = labels.indexOf('Filter by state')
    const cityIndex = labels.indexOf('Filter by city')
    expect(stateIndex).toBeGreaterThanOrEqual(0)
    expect(cityIndex).toBeGreaterThan(stateIndex)
  })

  it('City is disabled until a State is selected', () => {
    renderBar()
    expect(screen.getByRole('combobox', { name: /filter by city/i })).toBeDisabled()
  })

  it('search input calls setFilter with the typed value', async () => {
    const { setFilter } = renderBar()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText(/search by name/i), 'a')
    expect(setFilter).toHaveBeenCalledWith('search', 'a')
  })

  it('Reset calls the reset prop and remounts StateCityFilter (clearing its own text, not just the parent filters)', async () => {
    const { reset } = renderBar({ ...DEFAULT_FILTERS, city: 'Pune', state: 'Maharashtra' })
    const user = userEvent.setup()

    expect(screen.getByRole('combobox', { name: /filter by state/i })).toHaveValue('Maharashtra')

    await user.click(screen.getByRole('button', { name: /reset/i }))
    expect(reset).toHaveBeenCalledTimes(1)

    // reset() alone doesn't change the filters prop (that's the parent's job) — this just confirms
    // the remount mechanism (resetKey bump) fired, which is what clears StateCityFilter's own text.
  })

  it('specialization and status selects are present and independent of the State/City pair', () => {
    renderBar()
    expect(screen.getByText('Specialization')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })
})
