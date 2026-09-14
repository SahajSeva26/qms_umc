import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
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

const getInventoryAssignmentReport = vi.fn(async () => ({
  success: true,
  message: '',
  data: {
    summary: { totalFieldOfficers: 0, fieldOfficersHoldingInventory: 0 },
    fieldOfficers: [] as {
      role: string; name: string; code: string
      devicesHeld: number; consumableUnitsHeld: number
      awaitingApproval: number; awaitingReceipt: number
    }[],
  },
}))

vi.mock('@/features/inventory/real/inventoryAssignment.service', () => ({
  inventoryAssignmentService: {
    searchInventoryAssignments: () => searchInventoryAssignments(),
    getInventoryAssignmentReport: () => getInventoryAssignmentReport(),
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
    getInventoryAssignmentReport.mockResolvedValue({
      success: true,
      message: '',
      data: { summary: { totalFieldOfficers: 0, fieldOfficersHoldingInventory: 0 }, fieldOfficers: [] },
    })
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

describe('InventoryAssignmentsPanel — FO roster report', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    searchRoleTypes.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })
    searchRoles.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })
    searchInventoryAssignments.mockResolvedValue({ success: true, message: '', data: { count: 1, items: [ASSIGNMENT_ITEM] } })
    searchInventoryDevices.mockResolvedValue({ success: true, message: '', data: { count: 1, items: [{ id: 'dev-1', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] } })
    searchGeoProfiles.mockResolvedValue({ success: true, message: '', data: { count: 1, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] } })
  })

  it('non-manager: report strip and FO roster table are both absent, report endpoint never called', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => false } as unknown as ReturnType<typeof usePermission>)

    const InventoryAssignmentsPanel = (await import('@/features/inventory/real/components/InventoryAssignmentsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryAssignmentsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('SN-001')
    expect(getInventoryAssignmentReport).not.toHaveBeenCalled()
    expect(screen.queryByText('Total Field Officers')).not.toBeInTheDocument()
    expect(screen.queryByText('All active field officers')).not.toBeInTheDocument()
  })

  it('manager: report strip and FO roster table render real data from the report response', async () => {
    getInventoryAssignmentReport.mockResolvedValue({
      success: true,
      message: '',
      data: {
        summary: { totalFieldOfficers: 12, fieldOfficersHoldingInventory: 8 },
        fieldOfficers: [
          { role: 'role-9', name: 'Priya Roster', code: 'fo-9', devicesHeld: 3, consumableUnitsHeld: 5, awaitingApproval: 1, awaitingReceipt: 0 },
        ],
      },
    })

    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)

    const InventoryAssignmentsPanel = (await import('@/features/inventory/real/components/InventoryAssignmentsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryAssignmentsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('All active field officers')
    expect(getInventoryAssignmentReport).toHaveBeenCalled()
    // 12/8 only exist in the report summary — the assignment list fixture's own count is 1.
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('Priya Roster')).toBeInTheDocument()
    expect(screen.getByText('fo-9')).toBeInTheDocument()
  })

  it('paging the FO roster table does not move the assignment list page, and vice versa', async () => {
    const foRoster = Array.from({ length: 11 }, (_, i) => ({
      role: `role-${i}`, name: `FO ${i}`, code: `fo-${i}`,
      devicesHeld: 0, consumableUnitsHeld: 0, awaitingApproval: 0, awaitingReceipt: 0,
    }))
    getInventoryAssignmentReport.mockResolvedValue({
      success: true,
      message: '',
      data: { summary: { totalFieldOfficers: 11, fieldOfficersHoldingInventory: 0 }, fieldOfficers: foRoster },
    })
    // 11 assignments so the assignment list also has 2 pages, independent of the FO roster's own 2 pages.
    searchInventoryAssignments.mockResolvedValue({ success: true, message: '', data: { count: 11, items: [ASSIGNMENT_ITEM] } })

    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)

    const InventoryAssignmentsPanel = (await import('@/features/inventory/real/components/InventoryAssignmentsPanel')).default
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryAssignmentsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('All active field officers')
    expect(screen.getByText('FO 0')).toBeInTheDocument()

    const rosterHeading = screen.getByText('All active field officers')
    const rosterContainer = rosterHeading.parentElement as HTMLElement
    const rosterNextButton = within(rosterContainer).getByRole('button', { name: /next/i })

    await user.click(rosterNextButton)

    // FO roster advanced to page 2 (FO 10 is the 11th/last row)...
    await screen.findByText('FO 10')
    expect(screen.queryByText('FO 0')).not.toBeInTheDocument()
    // ...while the assignment list above stayed on its own page 1.
    const assignmentPageLabels = screen.getAllByText(/page 1 of 2/i)
    expect(assignmentPageLabels.length).toBeGreaterThan(0)
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
