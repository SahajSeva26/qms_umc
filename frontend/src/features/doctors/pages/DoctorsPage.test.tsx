import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePermission } from '@/hooks/usePermission'
import type { DoctorEntity } from '@/types/doctor.types'

const fetchAutocompleteSuggestions = vi.fn()
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately loose: stands in for google.maps.places.PlacesLibrary | null across tests
let useMapsLibraryMock: (...args: unknown[]) => any = () => null

// A default (non-null) APIProviderContext value means every consumer sees "a provider exists"
// with no Provider wrapper needed — these tests exercise the normal combobox UI, not loading states.
vi.mock('@vis.gl/react-google-maps', async () => {
  const { createContext } = await import('react')
  return {
    useMapsLibrary: (...args: unknown[]) => useMapsLibraryMock(...args),
    useApiLoadingStatus: () => 'LOADING',
    APIProviderContext: createContext<unknown>({}),
    APILoadingStatus: { NOT_LOADED: 'NOT_LOADED', LOADING: 'LOADING', LOADED: 'LOADED', FAILED: 'FAILED', AUTH_FAILURE: 'AUTH_FAILURE' },
  }
})

function makePrediction(placeId: string, text: string, fetchFieldsResult: unknown) {
  return {
    placeId,
    text: { text, toString: () => text },
    toPlace: () => ({
      fetchFields: vi.fn(() => Promise.resolve(fetchFieldsResult)),
    }),
  }
}

function makeStateResult(placeId: string, name: string) {
  return {
    placePrediction: makePrediction(placeId, `${name}, India`, {
      place: {
        id: placeId,
        addressComponents: [{ longText: name, shortText: name, types: ['administrative_area_level_1'] }],
        location: { lat: () => 19.7, lng: () => 75.7 },
        viewport: { toString: () => 'vp' },
        types: ['administrative_area_level_1', 'political'],
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

vi.mock('@/hooks/usePermission')

const searchDoctors = vi.fn()
vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: {
    searchDoctors: (query: unknown) => searchDoctors(query),
  },
}))

function makeDoctor(id: string, city: string, state: string): DoctorEntity {
  return {
    id,
    pharmaCode: `PC-${id}`,
    name: `Dr ${id}`,
    specialization: 'cp',
    mobile: '9999999999',
    email: `${id}@example.com`,
    location: { addressLine1: '', city, state, pincode: '', coordinates: [0, 0] },
    createdAt: '',
    updatedAt: '',
    status: 'active',
    tenant: 't-1',
  }
}

function okResponse(items: DoctorEntity[]) {
  return { success: true, message: '', data: { count: items.length, items } }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <DoctorsPage />
    </QueryClientProvider>,
  )
}

// Deferred import (assigned in beforeEach) so the mocks above are registered before the module loads.
let DoctorsPage: typeof import('./DoctorsPage').default

describe('DoctorsPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Non-null so StateCityFilter renders its normal combobox UI — the first two tests only
    // exercise the plain city/state prop-seeding path, not a real Places lookup.
    useMapsLibraryMock = () => makePlacesLibrary()
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [] })
    vi.mocked(usePermission).mockReturnValue({
      hasPermission: () => false,
      hasAnyPermission: () => false,
      hasAllPermissions: () => false,
      session: null,
      permissions: [],
      isLoading: false,
      isFetching: false,
      isSettled: true,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePermission>)
    searchDoctors.mockResolvedValue(okResponse([]))
    DoctorsPage = (await import('./DoctorsPage')).default
  })

  it('clicking a Geography city row jumps to the Roster tab with BOTH city and state filters set', async () => {
    const doctors = [makeDoctor('1', 'Springfield', 'Illinois'), makeDoctor('2', 'Springfield', 'Missouri')]
    searchDoctors.mockResolvedValue(okResponse(doctors))

    renderPage()
    const user = userEvent.setup()

    await waitFor(() => expect(screen.getByRole('button', { name: /geography/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /geography/i }))

    await waitFor(() => expect(screen.getAllByRole('cell', { name: 'Springfield' })).toHaveLength(2))
    const missouriCell = screen.getByRole('cell', { name: 'Missouri' })
    await user.click(missouriCell.closest('tr')!)

    // Jumped to Roster — the filter bar (with its State/City comboboxes) is now visible.
    await waitFor(() => expect(screen.getByRole('combobox', { name: /filter by state/i })).toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('combobox', { name: /filter by state/i })).toHaveValue('Missouri'))
    await waitFor(() => expect(screen.getByRole('combobox', { name: /filter by city/i })).toHaveValue('Springfield'))
  })

  it('two doctors with the same city name in different states remain distinct Geography rows (regression guard)', async () => {
    const doctors = [makeDoctor('1', 'Springfield', 'Illinois'), makeDoctor('2', 'Springfield', 'Missouri')]
    searchDoctors.mockResolvedValue(okResponse(doctors))

    renderPage()
    const user = userEvent.setup()

    await waitFor(() => expect(screen.getByRole('button', { name: /geography/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /geography/i }))

    await waitFor(() => expect(screen.getAllByRole('cell', { name: 'Springfield' })).toHaveLength(2))
  })

  // The tests above mock useMapsLibrary to null, so StateCityFilter's seed-resolution effect
  // early-returns — they only prove prop-seeding, not the real Places-lookup path exercised here.
  it('the Geography jump\'s externalStateSeed/externalCitySeed actually drives a real Places lookup (not just the plain city/state prop-seeding path)', async () => {
    const doctors = [makeDoctor('1', 'Springfield', 'Illinois'), makeDoctor('2', 'Springfield', 'Missouri')]
    searchDoctors.mockResolvedValue(okResponse(doctors))
    // Stable reference across renders (real useMapsLibrary caches it) — a fresh object each render
    // would retrigger the seed effect's cleanup mid-flight, silently aborting the resolution.
    const stableLibrary = makePlacesLibrary()
    useMapsLibraryMock = () => stableLibrary
    fetchAutocompleteSuggestions.mockResolvedValue({ suggestions: [makeStateResult('s1', 'Missouri')] })

    renderPage()
    const user = userEvent.setup()

    await waitFor(() => expect(screen.getByRole('button', { name: /geography/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /geography/i }))

    await waitFor(() => expect(screen.getAllByRole('cell', { name: 'Springfield' })).toHaveLength(2))
    const missouriCell = screen.getByRole('cell', { name: 'Missouri' })
    await user.click(missouriCell.closest('tr')!)

    // Proves the ACTUAL Places-lookup effect ran (not just prop-seeding): the mocked
    // fetchAutocompleteSuggestions must have been called with the seeded state text.
    await waitFor(() =>
      expect(fetchAutocompleteSuggestions).toHaveBeenCalledWith(
        expect.objectContaining({ input: 'Missouri', includedPrimaryTypes: ['administrative_area_level_1'] }),
      ),
    )
    await waitFor(() => expect(screen.getByRole('combobox', { name: /filter by state/i })).toHaveValue('Missouri'))
    await waitFor(() => expect(screen.getByRole('combobox', { name: /filter by city/i })).toHaveValue('Springfield'))
    expect(screen.getByRole('combobox', { name: /filter by city/i })).toBeEnabled()
  })
})
