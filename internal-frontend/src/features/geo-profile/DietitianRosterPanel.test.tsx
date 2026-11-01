import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useGeoProfiles } from '@/features/geo-profile/hooks/useGeoProfiles'
import { useRole } from '@/features/access-management'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'
import { usePermission } from '@/hooks/usePermission'
import type { GeoProfileEntity } from '@/types/geoProfile.types'

vi.mock('@/features/geo-profile/hooks/useGeoProfiles')
vi.mock('@/features/access-management')
vi.mock('@/hooks/usePermission')
vi.mock('@/features/camps/hooks/useCampsReal')
vi.mock('@/features/inventory/real/hooks/useInventoryAssignments')

const profile: GeoProfileEntity = {
  id: 'gp-1', tenant: 'tenant-1', role: 'role-1', type: 'dietitian', status: 'active',
  coordinates: [72.87, 19.07], coverageRadius: 25000, meta: {},
  addressLine1: '1 MG Road', addressLine2: null, locality: null, city: 'Mumbai', state: 'Maharashtra',
  country: 'India', pincode: '400001', googlePlaceId: null, createdAt: '2026-01-01', updatedAt: '2026-01-02',
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><DietitianRosterPanel /></QueryClientProvider>)
}

import DietitianRosterPanel from './DietitianRosterPanel'

describe('DietitianRosterPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)
    vi.mocked(useGeoProfiles).mockReturnValue({
      data: { success: true, message: '', data: { count: 1, items: [profile] } },
      isLoading: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGeoProfiles>)
    vi.mocked(useRole).mockReturnValue({
      data: { success: true, message: '', data: {
        id: 'role-1', code: 'diet-1', name: 'Dietitian role', permissions: [], status: 'active',
        type: 'type-1', tenant: 'tenant-1', user: { firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', phone: '9999999999' },
        createdAt: '', updatedAt: '',
      } },
      isLoading: false,
    } as unknown as ReturnType<typeof useRole>)
    vi.mocked(useCampsReal).mockReturnValue({
      data: { success: true, message: '', data: { count: 0, items: [] } }, isLoading: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampsReal>)
    vi.mocked(useInventoryAssignments).mockReturnValue({
      data: { success: true, message: '', data: { count: 0, items: [] } }, isLoading: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInventoryAssignments>)
  })

  it('queries active dietitian coverage profiles with bounded pagination', () => {
    renderPanel()
    expect(useGeoProfiles).toHaveBeenCalledWith({ type: 'dietitian', status: 'active', page: '1', limit: '10' })
    expect(screen.getByText('Asha Rao')).toBeInTheDocument()
    expect(screen.getByText('25 km')).toBeInTheDocument()
  })

  it('opens a detail drawer with real contact and coverage information', async () => {
    renderPanel()
    await userEvent.setup().click(screen.getByRole('button', { name: /asha rao/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('asha@example.com')).toBeInTheDocument()
    expect(screen.getByText(/coordinates: 19.07, 72.87/i)).toBeInTheDocument()
    expect(screen.getByText(/machines assigned \(0\)/i)).toBeInTheDocument()
    expect(screen.getByText(/camp history \(0\)/i)).toBeInTheDocument()
  })

  it('keeps the roster usable without role-read permission', () => {
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => false } as unknown as ReturnType<typeof usePermission>)
    vi.mocked(useRole).mockReturnValue({ data: undefined, isLoading: false } as unknown as ReturnType<typeof useRole>)
    renderPanel()

    expect(useRole).toHaveBeenCalledWith(undefined)
    expect(screen.getByText('Dietitian profile')).toBeInTheDocument()
    expect(screen.getByText(/1 mg road, mumbai, maharashtra, 400001/i)).toBeInTheDocument()
  })
})
