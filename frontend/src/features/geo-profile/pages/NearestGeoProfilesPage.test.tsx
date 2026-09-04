import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

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

vi.mock('@/features/geo-profile/hooks/useNearestGeoProfiles', () => ({
  useNearestGeoProfiles: vi.fn(() => ({ data: undefined, isLoading: false, isFetching: false, error: null })),
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    getRole: vi.fn(async () => ({ success: true, message: '', data: null })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPage() {
  const NearestGeoProfilesPage = (await import('./NearestGeoProfilesPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <NearestGeoProfilesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NearestGeoProfilesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('blocks search with no location picked', async () => {
    const { useNearestGeoProfiles } = await import('@/features/geo-profile/hooks/useNearestGeoProfiles')
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /find nearest/i }))

    expect(await screen.findByText(/pick a location on the map/i)).toBeInTheDocument()
    // useNearestGeoProfiles is called on every render with whatever `query` currently is —
    // what matters is that it's never invoked with a non-null query (i.e. no search ever fires).
    for (const call of vi.mocked(useNearestGeoProfiles).mock.calls) {
      expect(call[0]).toBeNull()
    }
  })

  it('fires the search with the correct flat {type, lat, lng, limit} query once a location is picked', async () => {
    const { useNearestGeoProfiles } = await import('@/features/geo-profile/hooks/useNearestGeoProfiles')
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /find nearest/i }))

    await waitFor(() => {
      const lastCall = vi.mocked(useNearestGeoProfiles).mock.calls.at(-1)
      expect(lastCall?.[0]).toEqual({ type: 'fo', lat: 29.2183, lng: 79.5130, limit: '10' })
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
    // Mirrors GeoProfileDetailPage's Save guard: a pin can visibly move
    // before `location` itself updates. The button is disabled outright
    // during 'loading', same belt-and-braces UI affordance as Save.
    const { useNearestGeoProfiles } = await import('@/features/geo-profile/hooks/useNearestGeoProfiles')
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))

    const searchButton = await screen.findByRole('button', { name: /resolving location/i })
    expect(searchButton).toBeDisabled()
    for (const call of vi.mocked(useNearestGeoProfiles).mock.calls) {
      expect(call[0]).toBeNull()
    }
  })

  it('blocks Find nearest when the picked pin failed to resolve, never fires a search', async () => {
    const { useNearestGeoProfiles } = await import('@/features/geo-profile/hooks/useNearestGeoProfiles')
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolve error/i }))
    await user.click(screen.getByRole('button', { name: /find nearest/i }))

    expect(await screen.findByText(/retry or choose "use this pin"/i)).toBeInTheDocument()
    for (const call of vi.mocked(useNearestGeoProfiles).mock.calls) {
      expect(call[0]).toBeNull()
    }
  })

  it('allows the search once resolution returns to idle after an error state', async () => {
    const { useNearestGeoProfiles } = await import('@/features/geo-profile/hooks/useNearestGeoProfiles')
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolve error/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolved/i }))
    await user.click(screen.getByRole('button', { name: /find nearest/i }))

    await waitFor(() => {
      const lastCall = vi.mocked(useNearestGeoProfiles).mock.calls.at(-1)
      expect(lastCall?.[0]).toEqual({ type: 'fo', lat: 29.2183, lng: 79.5130, limit: '10' })
    })
  })
})
