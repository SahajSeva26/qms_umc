import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'
import CampFoPicker from './CampFoPicker'

vi.mock('@/features/geo-profile/geoProfile.service', () => ({
  geoProfileService: {
    nearestGeoProfiles: vi.fn(),
  },
}))
vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    getRole: vi.fn(),
  },
}))

function roleFixture(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return {
    id: 'role-1', code: 'fo-001', name: 'Gurugram FO', permissions: [], status: 'active',
    type: { name: 'Field Officer', code: 'field-officer' },
    user: { firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@example.com', phone: '9876543210' },
    tenant: { name: 'Qms', code: 'qms' },
    createdAt: '', updatedAt: '', ...overrides,
  } as RoleEntity
}

function nearestFixture(overrides: Partial<GeoProfileEntity> = {}): GeoProfileEntity {
  return {
    id: 'geo-1', tenant: 't-1', role: 'role-1', type: 'fo', status: 'active',
    coordinates: [77.0, 28.5], coverageRadius: 35000, meta: {},
    addressLine1: null, addressLine2: null, locality: null, city: 'Gurugram', state: 'Haryana',
    country: 'India', pincode: null, googlePlaceId: null,
    createdAt: '', updatedAt: '', distance: 12000, ...overrides,
  } as GeoProfileEntity
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Every existing test that exercises a real fetch passes a full "ready" set
// (coordinates + date + timeSlot) via this default — gating tests below
// override individual fields back to undefined to exercise the gate itself.
const READY_PROPS = { coordinates: [77.02, 28.52] as [number, number], date: '2026-09-20', timeSlot: '9am-1pm' as const }

function renderPicker(props: Partial<React.ComponentProps<typeof CampFoPicker>> = {}) {
  const Wrapper = makeWrapper()
  return render(
    <Wrapper>
      <CampFoPicker value="" label="Field Officer" onChange={vi.fn()} {...READY_PROPS} {...props} />
    </Wrapper>,
  )
}

describe('CampFoPicker — coverage-radius eligibility, availability shown as a soft (non-blocking) pill', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(geoProfileService.nearestGeoProfiles).mockResolvedValue({
      success: true, message: '', data: { items: [nearestFixture({ available: true })], count: 1 },
    })
    vi.mocked(accessManagementService.getRole).mockResolvedValue({
      success: true, message: '', data: roleFixture(),
    })
  })

  it('is disabled with a "Pick a location first" placeholder when no coordinates are given', () => {
    renderPicker({ coordinates: undefined })

    expect(screen.getByPlaceholderText('Pick a location first')).toBeDisabled()
  })

  it('is disabled with a "Pick a date and time slot first" placeholder when coordinates exist but date/timeSlot do not', () => {
    renderPicker({ date: undefined, timeSlot: undefined })

    expect(screen.getByPlaceholderText('Pick a date and time slot first')).toBeDisabled()
  })

  it('stays disabled with the date/timeSlot placeholder even when only ONE of the two is set (date without timeSlot)', () => {
    renderPicker({ date: '2026-09-20', timeSlot: undefined })

    expect(screen.getByPlaceholderText('Pick a date and time slot first')).toBeDisabled()
  })

  it('never calls nearestGeoProfiles while the dropdown is closed, even with coordinates+date+timeSlot present', async () => {
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    renderPicker()

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(geoProfileService.nearestGeoProfiles).not.toHaveBeenCalled()
  })

  it('calls nearestGeoProfiles with coordinates AND date/timeSlot once the dropdown opens, and resolves + renders the FO with distance', async () => {
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const user = userEvent.setup()
    renderPicker()

    await user.click(screen.getByPlaceholderText('Search FO by name…'))

    await waitFor(() =>
      expect(geoProfileService.nearestGeoProfiles).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'fo', lng: 77.02, lat: 28.52, date: '2026-09-20', timeSlot: '9am-1pm' }),
      ),
    )
    expect(await screen.findByText(/Gurugram FO \(fo-001\) — 12\.0 km/)).toBeInTheDocument()
  })

  it('an in-range FO whose `available` is false still shows (for context), tagged Unavailable, and cannot be picked', async () => {
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    vi.mocked(geoProfileService.nearestGeoProfiles).mockResolvedValue({
      success: true,
      message: '',
      data: {
        items: [
          nearestFixture({ available: true }),
          nearestFixture({ id: 'geo-2', role: 'role-2', distance: 5000, available: false }),
        ],
        count: 2,
      },
    })
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.getRole).mockImplementation(async (id: string) => ({
      success: true, message: '', data: id === 'role-2' ? roleFixture({ id: 'role-2', code: 'fo-002', name: 'Busy FO' }) : roleFixture(),
    }))
    const onChange = vi.fn()

    const user = userEvent.setup()
    renderPicker({ onChange })
    await user.click(screen.getByPlaceholderText('Search FO by name…'))

    expect(await screen.findByText(/Gurugram FO/)).toBeInTheDocument()
    const busyRow = await screen.findByText(/Busy FO/)
    expect(busyRow).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.getByText('Unavailable')).toBeInTheDocument()

    const busyButton = busyRow.closest('button')!
    expect(busyButton).toBeDisabled()
    await user.click(busyButton)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('client-side filters the in-range, available results by typed name — no server round trip for text search', async () => {
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    vi.mocked(geoProfileService.nearestGeoProfiles).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [nearestFixture({ available: true }), nearestFixture({ id: 'geo-2', role: 'role-2', distance: 20000, available: true })], count: 2 },
    })
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.getRole).mockImplementation(async (id: string) => ({
      success: true, message: '', data: id === 'role-2' ? roleFixture({ id: 'role-2', code: 'fo-002', name: 'Delhi FO' }) : roleFixture(),
    }))

    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByPlaceholderText('Search FO by name…'))
    await screen.findByText(/Gurugram FO/)
    expect(screen.getByText(/Delhi FO/)).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Search FO by name…'), 'gurugram')

    await waitFor(() => expect(screen.queryByText(/Delhi FO/)).not.toBeInTheDocument())
    expect(screen.getByText(/Gurugram FO/)).toBeInTheDocument()
    expect(geoProfileService.nearestGeoProfiles).toHaveBeenCalledTimes(1)
  })

  it('shows the coverage-specific empty state when nothing is in range, not the generic "no matching" text', async () => {
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    vi.mocked(geoProfileService.nearestGeoProfiles).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 0 },
    })
    const user = userEvent.setup()
    renderPicker({ coordinates: [80.27, 13.08] })
    await user.click(screen.getByPlaceholderText('Search FO by name…'))

    expect(await screen.findByText("No field officers' coverage reaches this location.")).toBeInTheDocument()
  })

  it('shows a distinct message when a typed name matches nothing within the in-range set (available or not)', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByPlaceholderText('Search FO by name…'))
    await screen.findByText(/Gurugram FO/)

    await user.type(screen.getByPlaceholderText('Search FO by name…'), 'zzz-no-match')

    expect(await screen.findByText('No in-range field officers match that name.')).toBeInTheDocument()
  })

  it('surfaces a nearestGeoProfiles failure as a real error, not an empty/silent result', async () => {
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    vi.mocked(geoProfileService.nearestGeoProfiles).mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByPlaceholderText('Search FO by name…'))

    expect(await screen.findByText("Couldn't search field officers. Try again.")).toBeInTheDocument()
  })

  it('shows the truncation note only when the nearest result count equals the limit', async () => {
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const twentyResults = Array.from({ length: 20 }, (_, i) => nearestFixture({ id: `geo-${i}`, role: `role-${i}`, available: true }))
    vi.mocked(geoProfileService.nearestGeoProfiles).mockResolvedValue({
      success: true, message: '', data: { items: twentyResults, count: 20 },
    })
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.getRole).mockImplementation(async (id: string) => ({
      success: true, message: '', data: roleFixture({ id, code: id }),
    }))

    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByPlaceholderText('Search FO by name…'))

    expect(await screen.findByText(/some in-range FOs may not be listed/i)).toBeInTheDocument()
  })

  it('does not show the truncation note when the result count is below the limit', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByPlaceholderText('Search FO by name…'))
    await screen.findByText(/Gurugram FO/)

    expect(screen.queryByText(/some in-range FOs may not be listed/i)).not.toBeInTheDocument()
  })
})
