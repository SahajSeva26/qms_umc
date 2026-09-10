import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RoleEntity, RoleTypeEntity } from '@/types/accessManagement.types'
import { toast } from '@/components/ui/sonner'

vi.mock('@/hooks/usePermission')

vi.mock('@/components/ui/sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))

const ASSIGNMENT_ITEM = {
  id: 'asn-1',
  assignee: { id: 'role-1', name: 'Jane FO', code: 'fo-1' },
  inventoryType: 'InventoryDevice',
  inventory: { id: 'dev-1', serialNumber: 'SN-001', status: 'assigned' },
  quantity: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const searchInventoryAssignments = vi.fn(async () => ({
  success: true,
  message: '',
  data: { count: 1, items: [ASSIGNMENT_ITEM] },
}))

vi.mock('@/features/inventory/real/inventoryAssignment.service', () => ({
  inventoryAssignmentService: {
    searchInventoryAssignments: () => searchInventoryAssignments(),
  },
}))

// handleExport's CSV/blob download is exercised elsewhere (inventoryAssignment.export.ts) —
// mocked out here so these tests isolate the truncation-warning logic instead of jsdom's
// Blob/URL.createObjectURL plumbing.
vi.mock('@/features/inventory/real/inventoryAssignment.export', () => ({
  downloadAssignedDevicesCsv: vi.fn(),
}))

const searchInventoryDevices = vi.fn(async () => ({
  success: true,
  message: '',
  data: { count: 1, items: [{ id: 'dev-1', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] },
}))

vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: {
    searchInventoryDevices: () => searchInventoryDevices(),
  },
}))

const searchGeoProfiles = vi.fn(async () => ({
  success: true,
  message: '',
  data: { count: 1, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] },
}))

vi.mock('@/features/geo-profile/geoProfile.service', () => ({
  geoProfileService: {
    searchGeoProfiles: () => searchGeoProfiles(),
  },
}))

const searchRoleTypes = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: RoleTypeEntity[]; count: number } }>>()
const searchRoles = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: RoleEntity[]; count: number } }>>()

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchRoleTypes: (query: unknown) => searchRoleTypes(query),
    searchRoles: (query: unknown) => searchRoles(query),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

// Locks in the product rule from features/inventory/real/*: assignment rows
// only ever appear/disappear via the FO request lifecycle, never a manual
// write — this must hold even for a manager-level identity, not just default off.
describe('InventoryAssignmentsPanel — read-only', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    searchRoleTypes.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })
    searchRoles.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })
    searchInventoryAssignments.mockResolvedValue({ success: true, message: '', data: { count: 1, items: [ASSIGNMENT_ITEM] } })
    searchInventoryDevices.mockResolvedValue({ success: true, message: '', data: { count: 1, items: [{ id: 'dev-1', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] } })
    searchGeoProfiles.mockResolvedValue({ success: true, message: '', data: { count: 1, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] } })
  })

  it('renders the table with no create/delete controls and no clickable row, even for a manager-level identity', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)

    const InventoryAssignmentsPanel = (await import('@/features/inventory/real/components/InventoryAssignmentsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryAssignmentsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('SN-001')

    expect(screen.queryByRole('button', { name: /new assignment/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove assignment/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const row = screen.getByText('SN-001').closest('tr')
    expect(row).not.toHaveClass('cursor-pointer')
  })
})

// A stock inventory-manager permission set holds neither tenant:manage nor tenant:admin.
describe('InventoryAssignmentsPanel — Field Officer filter permission gating', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    searchRoleTypes.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })
    searchRoles.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })
    searchInventoryAssignments.mockResolvedValue({ success: true, message: '', data: { count: 1, items: [ASSIGNMENT_ITEM] } })
    searchInventoryDevices.mockResolvedValue({ success: true, message: '', data: { count: 1, items: [{ id: 'dev-1', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] } })
    searchGeoProfiles.mockResolvedValue({ success: true, message: '', data: { count: 1, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] } })
  })

  it('without tenant:manage/tenant:admin: the Field Officer filter does not render and never queries role-types/roles', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({
      hasAnyPermission: (perms: string[]) => perms.every((p) => p.startsWith('inventory-')),
    } as unknown as ReturnType<typeof usePermission>)

    const InventoryAssignmentsPanel = (await import('@/features/inventory/real/components/InventoryAssignmentsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryAssignmentsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('SN-001')

    expect(screen.queryByText('All field officers')).not.toBeInTheDocument()
    expect(searchRoleTypes).not.toHaveBeenCalled()
    expect(searchRoles).not.toHaveBeenCalled()
    // The rest of the tab stays fully usable.
    expect(screen.getByText('All types')).toBeInTheDocument()
  })

  it('with tenant:admin: the Field Officer filter renders and resolves the field-officer role type', async () => {
    searchRoleTypes.mockResolvedValue({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [{
          id: 'rt-fo', code: 'field-officer', name: 'Field Officer', description: '', permissions: [],
          tenant: 'tenant-1', createdAt: '', updatedAt: '',
        }],
      },
    })
    searchRoles.mockResolvedValue({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [{
          id: 'role-1', name: 'Jane FO', code: 'fo-1', permissions: [], status: 'active',
          type: 'rt-fo', user: 'user-1', tenant: 'tenant-1', createdAt: '', updatedAt: '',
        }],
      },
    })

    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({
      hasAnyPermission: (perms: string[]) => perms.includes('tenant:admin'),
    } as unknown as ReturnType<typeof usePermission>)

    const InventoryAssignmentsPanel = (await import('@/features/inventory/real/components/InventoryAssignmentsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryAssignmentsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('SN-001')
    expect(screen.getByText('All field officers')).toBeInTheDocument()

    await vi.waitFor(() => expect(searchRoleTypes).toHaveBeenCalledWith(expect.objectContaining({ code: 'field-officer' })))
    await vi.waitFor(() => expect(searchRoles).toHaveBeenCalledWith(expect.objectContaining({ type: 'rt-fo' })))
  })
})

// Regression coverage for the silent-truncation bug: handleExport fetches
// assignments/devices/geo-profiles in parallel, each capped at limit:'1000', but only
// the assignments fetch was ever checked against its own real total — a devices or
// geo-profiles fetch that hit the same cap silently null-joined Status/Calibration/FO
// City onto affected rows with no warning at all.
describe('InventoryAssignmentsPanel — export truncation warning', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    searchRoleTypes.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })
    searchRoles.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })
    searchInventoryAssignments.mockResolvedValue({ success: true, message: '', data: { count: 1, items: [ASSIGNMENT_ITEM] } })
    searchInventoryDevices.mockResolvedValue({ success: true, message: '', data: { count: 1, items: [{ id: 'dev-1', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] } })
    searchGeoProfiles.mockResolvedValue({ success: true, message: '', data: { count: 1, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] } })

    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => false } as unknown as ReturnType<typeof usePermission>)
  })

  async function clickExport() {
    const InventoryAssignmentsPanel = (await import('@/features/inventory/real/components/InventoryAssignmentsPanel')).default
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryAssignmentsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('SN-001')
    await user.click(screen.getByRole('button', { name: /export devices/i }))
    return user
  }

  it('warns when the devices fetch alone is truncated, even though assignments is not', async () => {
    // 1000 real devices exist but the capped fetch only returned 1 -> devices-only truncation.
    searchInventoryDevices.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1000, items: [{ id: 'dev-1', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] },
    })

    await clickExport()

    await vi.waitFor(() => expect(searchInventoryDevices).toHaveBeenCalled())
    await vi.waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      'Export is incomplete: too many devices to include all — some rows may show missing data.',
    ))
  })

  it('warns naming BOTH datasets when devices and geo-profiles are truncated simultaneously', async () => {
    searchInventoryDevices.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1000, items: [{ id: 'dev-1', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] },
    })
    searchGeoProfiles.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1000, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] },
    })

    await clickExport()

    await vi.waitFor(() => expect(searchGeoProfiles).toHaveBeenCalled())
    await vi.waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      'Export is incomplete: too many devices, FO geo-profiles to include all — some rows may show missing data.',
    ))
    expect(toast.warning).toHaveBeenCalledTimes(1)
  })

  it('warns naming ALL THREE datasets when assignments, devices, and geo-profiles are all truncated', async () => {
    searchInventoryAssignments.mockResolvedValue({ success: true, message: '', data: { count: 1000, items: [ASSIGNMENT_ITEM] } })
    searchInventoryDevices.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1000, items: [{ id: 'dev-1', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] },
    })
    searchGeoProfiles.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1000, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] },
    })

    await clickExport()

    await vi.waitFor(() => expect(searchGeoProfiles).toHaveBeenCalled())
    await vi.waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      'Export is incomplete: too many assignments, devices, FO geo-profiles to include all — some rows may show missing data.',
    ))
    expect(toast.warning).toHaveBeenCalledTimes(1)
  })

  it('warns when the FO geo-profiles fetch alone is truncated, even though assignments and devices are not', async () => {
    searchGeoProfiles.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1000, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] },
    })

    await clickExport()

    await vi.waitFor(() => expect(searchGeoProfiles).toHaveBeenCalled())
    await vi.waitFor(() => expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('FO geo-profiles')))
  })

  it('does not warn when assignments, devices, and geo-profiles are all complete', async () => {
    await clickExport()

    await vi.waitFor(() => expect(searchInventoryDevices).toHaveBeenCalled())
    expect(toast.warning).not.toHaveBeenCalled()
  })
})
