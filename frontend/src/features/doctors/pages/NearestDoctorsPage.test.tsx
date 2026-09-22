import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { DoctorEntity } from '@/types/doctor.types'

vi.mock('@/components/widgets/location-picker/LocationPicker', () => ({
  default: ({ value, onChange, onResolutionStateChange }: {
    value: unknown
    onChange: (v: unknown) => void
    onResolutionStateChange?: (status: 'idle' | 'loading' | 'error') => void
  }) => (
    <>
      <button
        type="button"
        onClick={() => onChange({ ...(value as object ?? {}), coordinates: [79.5130, 29.2183] })}
      >
        Set test coordinates
      </button>
      {/* Simulates the real widget's "pin moved, reverse-geocode still resolving"
          window — the gap between a drag/click and onChange actually firing. */}
      <button type="button" onClick={() => onResolutionStateChange?.('loading')}>
        Simulate location resolving
      </button>
      <button type="button" onClick={() => onResolutionStateChange?.('error')}>
        Simulate location resolve error
      </button>
      <button type="button" onClick={() => onResolutionStateChange?.('idle')}>
        Simulate location resolved
      </button>
    </>
  ),
}))

vi.mock('@/features/doctors/hooks/useNearestDoctors', () => ({
  useNearestDoctors: vi.fn(() => ({ data: undefined, isLoading: false, isFetching: false, error: null, refetch: vi.fn() })),
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function doctorFixture(overrides: Partial<DoctorEntity> = {}): DoctorEntity {
  return {
    id: 'doc-1', pharmaCode: 'DOC-1', name: 'Dr. Priya Sharma', specialization: 'cp',
    mobile: '9876543210', email: 'p@example.com',
    location: { addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra', pincode: '411001', coordinates: [73.8567, 18.5204] },
    division: 'div-1', createdAt: '', updatedAt: '', tenant: 't-1', distanceMeters: 1234,
    ...overrides,
  } as DoctorEntity
}

async function renderPage() {
  const NearestDoctorsPage = (await import('./NearestDoctorsPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <NearestDoctorsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NearestDoctorsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('blocks search with no location picked', async () => {
    const { useNearestDoctors } = await import('@/features/doctors/hooks/useNearestDoctors')
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /find nearest/i }))

    expect(await screen.findByText(/pick a location on the map/i)).toBeInTheDocument()
    for (const call of vi.mocked(useNearestDoctors).mock.calls) {
      expect(call[0]).toBeNull()
    }
  })

  it('fires the search with the correct flat {lng, lat, specialization, limit} query once a location is picked, using the coordinates in [lng, lat] order', async () => {
    const { useNearestDoctors } = await import('@/features/doctors/hooks/useNearestDoctors')
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /find nearest/i }))

    await waitFor(() => {
      const lastCall = vi.mocked(useNearestDoctors).mock.calls.at(-1)
      expect(lastCall?.[0]).toEqual({ lng: 79.5130, lat: 29.2183, specialization: undefined, limit: '10' })
    })
  })

  it('shows the confirmation line with the picked coordinates', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    expect(await screen.findByText(/latitude: 29.2183/i)).toBeInTheDocument()
    expect(screen.getByText(/longitude: 79.513/i)).toBeInTheDocument()
  })

  it('disables Find nearest (relabeled "Resolving location…") while the picked pin is still resolving, so no search fires', async () => {
    const { useNearestDoctors } = await import('@/features/doctors/hooks/useNearestDoctors')
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))

    const searchButton = await screen.findByRole('button', { name: /resolving location/i })
    expect(searchButton).toBeDisabled()
    for (const call of vi.mocked(useNearestDoctors).mock.calls) {
      expect(call[0]).toBeNull()
    }
  })

  it('blocks Find nearest when the picked pin failed to resolve, never fires a search', async () => {
    const { useNearestDoctors } = await import('@/features/doctors/hooks/useNearestDoctors')
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolve error/i }))
    await user.click(screen.getByRole('button', { name: /find nearest/i }))

    expect(await screen.findByText(/retry or choose "use this pin"/i)).toBeInTheDocument()
    for (const call of vi.mocked(useNearestDoctors).mock.calls) {
      expect(call[0]).toBeNull()
    }
  })

  it('allows the search once resolution returns to idle after an error state', async () => {
    const { useNearestDoctors } = await import('@/features/doctors/hooks/useNearestDoctors')
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolve error/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolved/i }))
    await user.click(screen.getByRole('button', { name: /find nearest/i }))

    await waitFor(() => {
      const lastCall = vi.mocked(useNearestDoctors).mock.calls.at(-1)
      expect(lastCall?.[0]).toEqual({ lng: 79.5130, lat: 29.2183, specialization: undefined, limit: '10' })
    })
  })

  it('shows an empty state when the search returns no results', async () => {
    const { useNearestDoctors } = await import('@/features/doctors/hooks/useNearestDoctors')
    vi.mocked(useNearestDoctors).mockReturnValue({
      data: { success: true, message: '', data: { items: [], count: 0 } },
      isLoading: false, isFetching: false, error: null,
    } as unknown as ReturnType<typeof useNearestDoctors>)
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /find nearest/i }))

    expect(await screen.findByText(/no doctors found within 35 km/i)).toBeInTheDocument()
  })

  it('renders "—" for a result whose distanceMeters is explicitly null, without crashing', async () => {
    const { useNearestDoctors } = await import('@/features/doctors/hooks/useNearestDoctors')
    const noDistance = doctorFixture({ id: 'doc-2', name: 'Dr. No Distance', distanceMeters: null })
    vi.mocked(useNearestDoctors).mockReturnValue({
      data: { success: true, message: '', data: { items: [noDistance], count: 1 } },
      isLoading: false, isFetching: false, error: null,
    } as unknown as ReturnType<typeof useNearestDoctors>)
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /find nearest/i }))

    expect(await screen.findByText('Dr. No Distance')).toBeInTheDocument()
    const row = screen.getByText('Dr. No Distance').closest('tr')
    expect(row).toHaveTextContent('—')
  })

  describe('Limit validation', () => {
    async function setLimit(user: ReturnType<typeof userEvent.setup>, value: string) {
      const input = screen.getByPlaceholderText('10')
      await user.clear(input)
      if (value) await user.type(input, value)
    }

    it.each([
      ['0', 'zero'],
      ['-5', 'a negative number'],
      ['abc', 'non-numeric text'],
      ['3.5', 'a non-integer'],
      ['101', 'a value over the max'],
    ])('rejects a limit of %s (%s), blocking the search with an inline error', async (value) => {
      const { useNearestDoctors } = await import('@/features/doctors/hooks/useNearestDoctors')
      const user = userEvent.setup()
      await renderPage()

      await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
      await setLimit(user, value)
      await user.click(screen.getByRole('button', { name: /find nearest/i }))

      expect(await screen.findByText(/limit must be a whole number between 1 and 100/i)).toBeInTheDocument()
      for (const call of vi.mocked(useNearestDoctors).mock.calls) {
        expect(call[0]).toBeNull()
      }
    })

    it('accepts a valid limit within range and submits it as a plain integer string', async () => {
      const { useNearestDoctors } = await import('@/features/doctors/hooks/useNearestDoctors')
      const user = userEvent.setup()
      await renderPage()

      await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
      await setLimit(user, '25')
      await user.click(screen.getByRole('button', { name: /find nearest/i }))

      await waitFor(() => {
        const lastCall = vi.mocked(useNearestDoctors).mock.calls.at(-1)
        expect(lastCall?.[0]).toEqual({ lng: 79.5130, lat: 29.2183, specialization: undefined, limit: '25' })
      })
    })

    it('defaults to 10 when the limit field is left blank', async () => {
      const { useNearestDoctors } = await import('@/features/doctors/hooks/useNearestDoctors')
      const user = userEvent.setup()
      await renderPage()

      await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
      await setLimit(user, '')
      await user.click(screen.getByRole('button', { name: /find nearest/i }))

      await waitFor(() => {
        const lastCall = vi.mocked(useNearestDoctors).mock.calls.at(-1)
        expect(lastCall?.[0]).toEqual({ lng: 79.5130, lat: 29.2183, specialization: undefined, limit: '10' })
      })
    })
  })

  describe('Retry on failure', () => {
    it('shows a Retry button on a failed search that calls refetch, not just re-submitting the same query', async () => {
      const { useNearestDoctors } = await import('@/features/doctors/hooks/useNearestDoctors')
      const refetch = vi.fn()
      vi.mocked(useNearestDoctors).mockReturnValue({
        data: undefined, isLoading: false, isFetching: false, error: new Error('failed'), refetch,
      } as unknown as ReturnType<typeof useNearestDoctors>)
      const user = userEvent.setup()
      await renderPage()

      await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
      await user.click(screen.getByRole('button', { name: /find nearest/i }))

      expect(await screen.findByText(/failed to search/i)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /retry/i }))

      expect(refetch).toHaveBeenCalledTimes(1)
    })
  })
})
