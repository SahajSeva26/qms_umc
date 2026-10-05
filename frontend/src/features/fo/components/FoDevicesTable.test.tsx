import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FoDevicesTable from './FoDevicesTable'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'
import type { FoRosterDeviceEntry } from '@/features/fo/hooks/useFoRosterDevices'

function roleFixture(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return {
    id: 'role-1', name: 'Fallback Name', status: 'active',
    user: { firstName: 'Jane', lastName: 'FO', email: 'jane@fo.test' },
    tenant: 't-1', type: 'rt-1', permissions: [], createdAt: '', updatedAt: '',
    ...overrides,
  } as unknown as RoleEntity
}

describe('FoDevicesTable', () => {
  it('shows the empty state when there are no roles', () => {
    render(<FoDevicesTable roles={[]} geoByRole={new Map()} devicesByRole={{}} onOpen={vi.fn()} />)

    expect(screen.getByText(/no fos match/i)).toBeInTheDocument()
  })

  it('shows "No devices handed over." when a role has no assignments', () => {
    render(<FoDevicesTable roles={[roleFixture()]} geoByRole={new Map()} devicesByRole={{}} onOpen={vi.fn()} />)

    expect(screen.getByText('Jane FO')).toBeInTheDocument()
    expect(screen.getByText('No devices handed over.')).toBeInTheDocument()
  })

  it('renders a device chip for each assignment', () => {
    const devicesByRole: Record<string, FoRosterDeviceEntry> = {
      'role-1': {
        assignments: [{
          id: 'a-1', assignee: { id: 'role-1' }, inventoryType: 'InventoryDevice',
          inventory: { id: 'd-1', serialNumber: 'SN-001' }, quantity: 1, createdAt: '', updatedAt: '',
        }],
        isLoading: false, error: null, refetch: vi.fn(), truncated: false,
      },
    }
    render(<FoDevicesTable roles={[roleFixture()]} geoByRole={new Map()} devicesByRole={devicesByRole} onOpen={vi.fn()} />)

    expect(screen.getByText('SN-001')).toBeInTheDocument()
  })

  it('shows a retryable error, not "no devices," when the fetch failed', () => {
    const refetch = vi.fn()
    const devicesByRole: Record<string, FoRosterDeviceEntry> = {
      'role-1': { assignments: [], isLoading: false, error: new Error('fail'), refetch, truncated: false },
    }
    render(<FoDevicesTable roles={[roleFixture()]} geoByRole={new Map()} devicesByRole={devicesByRole} onOpen={vi.fn()} />)

    expect(screen.getByText(/couldn't load devices/i)).toBeInTheDocument()
    expect(screen.queryByText('No devices handed over.')).not.toBeInTheDocument()
  })

  it('shows the geo-profile city under the FO name', () => {
    const geoByRole = new Map<string, GeoProfileEntity>([['role-1', { city: 'Mumbai' } as GeoProfileEntity]])
    render(<FoDevicesTable roles={[roleFixture()]} geoByRole={geoByRole} devicesByRole={{}} onOpen={vi.fn()} />)

    expect(screen.getByText('Mumbai')).toBeInTheDocument()
  })

  it('calls onOpen with the role id when the FO name is clicked', async () => {
    const onOpen = vi.fn()
    render(<FoDevicesTable roles={[roleFixture()]} geoByRole={new Map()} devicesByRole={{}} onOpen={onOpen} />)

    await userEvent.setup().click(screen.getByText('Jane FO'))
    expect(onOpen).toHaveBeenCalledWith('role-1')
  })
})
