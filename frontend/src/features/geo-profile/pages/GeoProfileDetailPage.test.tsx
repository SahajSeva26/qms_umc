import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { GeoProfileEntity } from '@/types/geoProfile.types'

vi.mock('@/hooks/usePermission')

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

vi.mock('@/features/geo-profile/geoProfile.service', () => ({
  geoProfileService: {
    getGeoProfile: vi.fn(),
    createGeoProfile: vi.fn(async () => ({ success: true, message: '', data: { id: 'gp-new' } })),
    updateGeoProfile: vi.fn(async () => ({ success: true, message: '', data: {} })),
  },
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 'role-1', name: 'FO One', code: 'fo-001' }], count: 1 } })),
    getRole: vi.fn(async () => ({ success: true, message: '', data: { id: 'role-1', name: 'FO One', code: 'fo-001' } })),
  },
}))

function geoProfileFixture(overrides: Partial<GeoProfileEntity> = {}): GeoProfileEntity {
  return {
    id: 'gp-1', tenant: 't-1', role: 'role-1', type: 'fo', status: 'active',
    coordinates: [79.5130, 29.2183], coverageRadius: 35000, meta: {},
    createdAt: '', updatedAt: '',
    ...overrides,
  }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function mockPermission(canManage: boolean) {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({ hasPermission: () => canManage } as unknown as ReturnType<typeof usePermission>)
}

async function renderCreatePage() {
  const GeoProfileDetailPage = (await import('./GeoProfileDetailPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/geo-profiles/new']}>
        <Routes>
          <Route path="/geo-profiles/new" element={<GeoProfileDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function renderEditPage(geoProfile: GeoProfileEntity) {
  const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
  vi.mocked(geoProfileService.getGeoProfile).mockResolvedValue({ success: true, message: '', data: geoProfile })

  const GeoProfileDetailPage = (await import('./GeoProfileDetailPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[`/geo-profiles/${geoProfile.id}`]}>
        <Routes>
          <Route path="/geo-profiles/:id" element={<GeoProfileDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GeoProfileDetailPage — create mode', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('blocks create with no location picked, never calls createGeoProfile', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderCreatePage()

    await user.click(screen.getByRole('combobox', { name: /role/i }))
    await user.click(await screen.findByText(/fo one/i))
    await user.click(screen.getByRole('combobox', { name: /type/i }))
    await user.click(await screen.findByText(/field officer/i))
    // Location deliberately never picked.

    await user.click(screen.getByRole('button', { name: /create geo profile/i }))

    expect(await screen.findByText(/pick a location on the map/i)).toBeInTheDocument()
    expect(geoProfileService.createGeoProfile).not.toHaveBeenCalled()
  })

  it('creates a geo profile with the exact [lng, lat] tuple once a location is picked', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderCreatePage()

    await user.click(screen.getByRole('combobox', { name: /role/i }))
    await user.click(await screen.findByText(/fo one/i))

    await user.click(screen.getByRole('combobox', { name: /type/i }))
    await user.click(await screen.findByText(/field officer/i))

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /create geo profile/i }))

    await waitFor(() => expect(geoProfileService.createGeoProfile).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(geoProfileService.createGeoProfile).mock.calls[0][0]
    expect(payload.coordinates).toEqual([79.5130, 29.2183])
  })

  it('shows the confirmation line with the picked coordinates', async () => {
    await mockPermission(true)
    const user = userEvent.setup()
    await renderCreatePage()

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    expect(await screen.findByText(/latitude: 29.2183/i)).toBeInTheDocument()
    expect(screen.getByText(/longitude: 79.513/i)).toBeInTheDocument()
  })

  it('disables Save (relabeled "Resolving location…") while the picked pin is still resolving, so createGeoProfile is never called', async () => {
    // The button is disabled outright here; the next test (error state,
    // where Save stays enabled) is what actually exercises handleSave's guard.
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderCreatePage()

    await user.click(screen.getByRole('combobox', { name: /role/i }))
    await user.click(await screen.findByText(/fo one/i))
    await user.click(screen.getByRole('combobox', { name: /type/i }))
    await user.click(await screen.findByText(/field officer/i))

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))

    const saveButton = await screen.findByRole('button', { name: /resolving location/i })
    expect(saveButton).toBeDisabled()
    expect(geoProfileService.createGeoProfile).not.toHaveBeenCalled()
  })

  it('blocks Save when the picked pin failed to resolve, never calls createGeoProfile', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderCreatePage()

    await user.click(screen.getByRole('combobox', { name: /role/i }))
    await user.click(await screen.findByText(/fo one/i))
    await user.click(screen.getByRole('combobox', { name: /type/i }))
    await user.click(await screen.findByText(/field officer/i))

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolve error/i }))
    await user.click(screen.getByRole('button', { name: /create geo profile/i }))

    expect(await screen.findByText(/retry or choose "use this pin"/i)).toBeInTheDocument()
    expect(geoProfileService.createGeoProfile).not.toHaveBeenCalled()
  })

  it('allows Save once resolution returns to idle after a loading state', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderCreatePage()

    await user.click(screen.getByRole('combobox', { name: /role/i }))
    await user.click(await screen.findByText(/fo one/i))
    await user.click(screen.getByRole('combobox', { name: /type/i }))
    await user.click(await screen.findByText(/field officer/i))

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolved/i }))
    await user.click(screen.getByRole('button', { name: /create geo profile/i }))

    await waitFor(() => expect(geoProfileService.createGeoProfile).toHaveBeenCalledTimes(1))
  })
})

describe('GeoProfileDetailPage — edit mode', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('loads the existing coordinates into the picker confirmation line', async () => {
    await mockPermission(true)
    await renderEditPage(geoProfileFixture({ coordinates: [79.5130, 29.2183] }))

    expect(await screen.findByText(/latitude: 29.2183/i)).toBeInTheDocument()
    expect(screen.getByText(/longitude: 79.513/i)).toBeInTheDocument()
  })

  it('saving WITHOUT touching the location omits coordinates from the payload entirely', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderEditPage(geoProfileFixture({ coordinates: [79.5130, 29.2183] }))

    await screen.findByText(/latitude: 29.2183/i)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(geoProfileService.updateGeoProfile).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(geoProfileService.updateGeoProfile).mock.calls[0]
    expect(payload.coordinates).toBeUndefined()
  })

  it('saving AFTER touching the picker includes the new coordinates', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderEditPage(geoProfileFixture({ coordinates: [77.2295, 28.6129] }))

    await screen.findByText(/latitude: 28.6129/i)
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(geoProfileService.updateGeoProfile).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(geoProfileService.updateGeoProfile).mock.calls[0]
    expect(payload.coordinates).toEqual([79.5130, 29.2183])
  })

  it('disables Save (relabeled "Resolving location…") while the picked pin is still resolving, so updateGeoProfile is never called', async () => {
    // Mirrors the create-mode test above — Save is disabled outright here.
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderEditPage(geoProfileFixture({ coordinates: [77.2295, 28.6129] }))

    await screen.findByText(/latitude: 28.6129/i)
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))

    const saveButton = await screen.findByRole('button', { name: /resolving location/i })
    expect(saveButton).toBeDisabled()
    expect(geoProfileService.updateGeoProfile).not.toHaveBeenCalled()
  })

  it('blocks Save when the picked pin failed to resolve, never calls updateGeoProfile', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderEditPage(geoProfileFixture({ coordinates: [77.2295, 28.6129] }))

    await screen.findByText(/latitude: 28.6129/i)
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolve error/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/retry or choose "use this pin"/i)).toBeInTheDocument()
    expect(geoProfileService.updateGeoProfile).not.toHaveBeenCalled()
  })

  it('allows Save once resolution returns to idle after an error state', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderEditPage(geoProfileFixture({ coordinates: [77.2295, 28.6129] }))

    await screen.findByText(/latitude: 28.6129/i)
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolve error/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolved/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(geoProfileService.updateGeoProfile).toHaveBeenCalledTimes(1))
  })
})
