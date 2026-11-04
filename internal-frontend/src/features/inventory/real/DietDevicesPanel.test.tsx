import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRole } from '@/features/access-management'
import { useGeoProfiles } from '@/features/geo-profile'
import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'
import { usePermission } from '@/hooks/usePermission'
import type { GeoProfileEntity } from '@/types/geoProfile.types'
import DietDevicesPanel from './DietDevicesPanel'

vi.mock('@/features/access-management')
vi.mock('@/features/geo-profile')
vi.mock('@/features/inventory/real/hooks/useInventoryAssignments')
vi.mock('@/hooks/usePermission')
vi.mock('@/features/inventory/real/components/DirectAssignmentModal', () => ({
  default: ({ fieldStaff }: { fieldStaff: Array<{ name: string }> }) => <div role="dialog">Managing {fieldStaff[0]?.name}</div>,
}))

const profile: GeoProfileEntity = {
  id: 'gp-1', tenant: 'tenant-1', role: 'role-1', type: 'dietitian', status: 'active',
  coordinates: [72.87, 19.07], coverageRadius: 25000, meta: {},
  addressLine1: null, addressLine2: null, locality: null, city: 'Mumbai', state: 'Maharashtra',
  country: 'India', pincode: null, googlePlaceId: null, createdAt: '', updatedAt: '',
}

describe('DietDevicesPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)
    vi.mocked(useGeoProfiles).mockReturnValue({
      data: { success: true, message: '', data: { count: 1, items: [profile] } }, isLoading: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGeoProfiles>)
    vi.mocked(useRole).mockReturnValue({
      data: { success: true, message: '', data: {
        id: 'role-1', code: 'dt-1', name: 'Dietitian role', permissions: [], status: 'active', type: 'type-1', tenant: 'tenant-1',
        user: { firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com' }, createdAt: '', updatedAt: '',
      } }, isLoading: false,
    } as unknown as ReturnType<typeof useRole>)
    vi.mocked(useInventoryAssignments).mockReturnValue({
      data: { success: true, message: '', data: { count: 1, items: [{
        id: 'assignment-1', assignee: { id: 'role-1' }, inventoryType: 'InventoryDevice',
        inventory: { id: 'device-1', serialNumber: 'BCA-500-001', status: 'assigned' }, quantity: 1, createdAt: '', updatedAt: '',
      }] } }, isLoading: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useInventoryAssignments>)
  })

  it('renders the prototype-style dietitian-to-device matrix from real assignments', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><DietDevicesPanel /></QueryClientProvider>)

    expect(useGeoProfiles).toHaveBeenCalledWith({ type: 'dietitian', status: 'active', page: '1', limit: '10' })
    expect(useInventoryAssignments).toHaveBeenCalledWith({ assignee: 'role-1', inventoryType: 'InventoryDevice', page: '1', limit: '10' })
    expect(screen.getByText('Dietitian × device matrix')).toBeInTheDocument()
    expect(screen.getByText('Asha Rao')).toBeInTheDocument()
    expect(screen.getByText('BCA-500-001')).toBeInTheDocument()
  })

  it('opens the existing real assignment workflow for the selected dietitian', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><DietDevicesPanel /></QueryClientProvider>)

    await userEvent.setup().click(screen.getByRole('button', { name: /manage/i }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Managing Asha Rao')
  })
})
