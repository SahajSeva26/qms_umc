import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { GeoProfileEntity } from '@/types/geoProfile.types'

vi.mock('@/hooks/usePermission')

vi.mock('@/components/widgets/location-picker/LocationPicker', () => ({
  default: ({ value, onChange, onResolutionStateChange, onManualCoordinateEntry }: {
    value: unknown
    onChange: (v: unknown) => void
    onResolutionStateChange?: (status: 'idle' | 'loading' | 'error') => void
    onManualCoordinateEntry?: () => void
  }) => (
    <>
      <button
        type="button"
        onClick={() => onChange({
          ...(value as object ?? {}),
          addressLine1: '', addressLine2: undefined, locality: undefined,
          city: '', state: '', pincode: '', country: undefined, googlePlaceId: undefined,
          coordinates: [79.5130, 29.2183],
        })}
      >
        Set test coordinates
      </button>
      <button
        type="button"
        onClick={() => onChange({
          ...(value as object ?? {}),
          coordinates: [77.2090, 28.6139],
          addressLine1: 'Kartavya Path', locality: 'India Gate',
          city: 'New Delhi', state: 'Delhi', pincode: '110001',
        })}
      >
        Pick a location with address details
      </button>
      {/* Simulates the Maps-down manual lat/lng fallback — address is preserved
          (real onChange is a no-op here), only the callback signal is what's tested. */}
      <button type="button" onClick={() => onManualCoordinateEntry?.()}>
        Simulate manual coordinate entry
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
    addressLine1: null, addressLine2: null, locality: null, city: null,
    state: null, country: null, pincode: null, googlePlaceId: null,
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

    await user.click(screen.getByRole('button', { name: /pick a location with address details/i }))
    await user.click(screen.getByRole('button', { name: /create geo profile/i }))

    await waitFor(() => expect(geoProfileService.createGeoProfile).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(geoProfileService.createGeoProfile).mock.calls[0][0]
    expect(payload.coordinates).toEqual([77.2090, 28.6139])
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

    await user.click(screen.getByRole('button', { name: /pick a location with address details/i }))
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

    await user.click(screen.getByRole('button', { name: /pick a location with address details/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolved/i }))
    await user.click(screen.getByRole('button', { name: /create geo profile/i }))

    await waitFor(() => expect(geoProfileService.createGeoProfile).toHaveBeenCalledTimes(1))
  })

  it('shows the picked address next to the coordinates, and submits it in the payload', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderCreatePage()

    await user.click(screen.getByRole('combobox', { name: /role/i }))
    await user.click(await screen.findByText(/fo one/i))
    await user.click(screen.getByRole('combobox', { name: /type/i }))
    await user.click(await screen.findByText(/field officer/i))

    await user.click(screen.getByRole('button', { name: /pick a location with address details/i }))
    expect(await screen.findByLabelText(/address line 1/i)).toHaveValue('Kartavya Path')
    expect(screen.getByLabelText(/^city/i)).toHaveValue('New Delhi')

    await user.click(screen.getByRole('button', { name: /create geo profile/i }))

    await waitFor(() => expect(geoProfileService.createGeoProfile).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(geoProfileService.createGeoProfile).mock.calls[0][0]
    expect(payload.addressLine1).toBe('Kartavya Path')
    expect(payload.city).toBe('New Delhi')
  })

  it('allows creating with coordinates but no address (post "Use this pin") — address is optional', async () => {
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

  it('shows the loaded profile\'s real address fields in the Location section', async () => {
    // Regression guard: this display was initially wired into the read-only
    // view only — a caller who can manage (lands on THIS edit form, not the
    // read-only view) saw no address at all until that gap was found and fixed.
    await mockPermission(true)
    await renderEditPage(geoProfileFixture({
      coordinates: [77.2090, 28.6139],
      addressLine1: 'Kartavya Path', locality: 'India Gate',
      city: 'New Delhi', state: 'Delhi', pincode: '110001',
    }))

    expect(await screen.findByLabelText(/address line 1/i)).toHaveValue('Kartavya Path')
    expect(screen.getByLabelText(/^city/i)).toHaveValue('New Delhi')
    expect(screen.getByLabelText(/^state/i)).toHaveValue('Delhi')
    expect(screen.getByLabelText(/pincode/i)).toHaveValue('110001')
  })

  it('shows empty address fields when the loaded profile has none set', async () => {
    await mockPermission(true)
    await renderEditPage(geoProfileFixture({ coordinates: [79.5130, 29.2183] }))

    await screen.findByText(/latitude: 29.2183/i)
    expect(screen.getByLabelText(/address line 1/i)).toHaveValue('')
  })

  it('saving WITHOUT touching the location omits address fields from the payload too', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderEditPage(geoProfileFixture({
      coordinates: [79.5130, 29.2183], city: 'Nashik', state: 'Maharashtra',
    }))

    await screen.findByText(/latitude: 29.2183/i)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(geoProfileService.updateGeoProfile).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(geoProfileService.updateGeoProfile).mock.calls[0]
    expect(payload.city).toBeUndefined()
    expect(payload.state).toBeUndefined()
  })

  it('saving AFTER touching the picker with a new address includes the new address fields', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderEditPage(geoProfileFixture({ coordinates: [77.2295, 28.6129] }))

    await screen.findByText(/latitude: 28.6129/i)
    await user.click(screen.getByRole('button', { name: /pick a location with address details/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(geoProfileService.updateGeoProfile).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(geoProfileService.updateGeoProfile).mock.calls[0]
    expect(payload.city).toBe('New Delhi')
    expect(payload.state).toBe('Delhi')
    expect(payload.addressLine1).toBe('Kartavya Path')
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
    await user.click(screen.getByRole('button', { name: /pick a location with address details/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(geoProfileService.updateGeoProfile).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(geoProfileService.updateGeoProfile).mock.calls[0]
    expect(payload.coordinates).toEqual([77.2090, 28.6139])
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
    await user.click(screen.getByRole('button', { name: /pick a location with address details/i }))
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
    await user.click(screen.getByRole('button', { name: /pick a location with address details/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolve error/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolved/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(geoProfileService.updateGeoProfile).toHaveBeenCalledTimes(1))
  })

  it('re-pinning a profile that never had an address shows no stale-address warning and saves fine', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderEditPage(geoProfileFixture({ coordinates: [77.2295, 28.6129] }))

    await screen.findByText(/latitude: 28.6129/i)
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))

    expect(screen.queryByText(/old address paired with the new pin/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(geoProfileService.updateGeoProfile).toHaveBeenCalledTimes(1))
  })

  it('re-pinning a profile that HAD an address (post "Use this pin") warns but still allows saving — address is optional', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderEditPage(geoProfileFixture({
      coordinates: [77.2295, 28.6129],
      addressLine1: 'Old Road', city: 'Pune', state: 'Maharashtra', pincode: '411001',
    }))

    await screen.findByText(/latitude: 28.6129/i)
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))

    expect(await screen.findByText(/old address paired with the new pin/i)).toBeInTheDocument()
    const saveButton = screen.getByRole('button', { name: /save changes/i })
    expect(saveButton).not.toBeDisabled()

    await user.click(saveButton)
    await waitFor(() => expect(geoProfileService.updateGeoProfile).toHaveBeenCalledTimes(1))
  })

  it('warns even when only a PARTIAL prior address existed (e.g. just city) — a lone field going stale still matters', async () => {
    await mockPermission(true)
    const user = userEvent.setup()
    await renderEditPage(geoProfileFixture({
      coordinates: [77.2295, 28.6129],
      city: 'Pune',
    }))

    await screen.findByText(/latitude: 28.6129/i)
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))

    expect(await screen.findByText(/old address paired with the new pin/i)).toBeInTheDocument()
  })

  it('warns to review the address after manual coordinate entry, even when the address is still complete', async () => {
    await mockPermission(true)
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    await renderEditPage(geoProfileFixture({
      coordinates: [77.2295, 28.6129],
      addressLine1: 'Old Road', city: 'Pune', state: 'Maharashtra', pincode: '411001',
    }))

    await screen.findByText(/latitude: 28.6129/i)
    await user.click(screen.getByRole('button', { name: /simulate manual coordinate entry/i }))

    expect(await screen.findByText(/coordinates were entered manually/i)).toBeInTheDocument()
    expect(screen.queryByText(/old address paired with the new pin/i)).not.toBeInTheDocument()

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    expect(saveButton).not.toBeDisabled()
    await user.click(saveButton)
    await waitFor(() => expect(geoProfileService.updateGeoProfile).toHaveBeenCalledTimes(1))
  })
})
