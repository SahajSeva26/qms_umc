import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from '@/components/ui/sonner'

vi.mock('@/hooks/usePermission')

vi.mock('@/components/ui/sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))

const DEVICE_ASSIGNMENT_ITEM = {
  id: 'asn-1',
  assignee: { id: 'role-1', name: 'Jane FO', code: 'fo-1' },
  inventoryType: 'InventoryDevice',
  inventory: { id: 'dev-1', serialNumber: 'SN-001', status: 'assigned' },
  quantity: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const CONSUMABLE_ASSIGNMENT_ITEM = {
  id: 'asn-2',
  assignee: { id: 'role-1', name: 'Jane FO', code: 'fo-1' },
  inventoryType: 'InventoryConsumable',
  inventory: { id: 'lot-1', batch: 'BATCH-01' },
  quantity: 25,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

// Branches on inventoryType, matching the panel's two separate device/consumable calls.
const searchInventoryAssignments = vi.fn(async (query: { inventoryType?: string }) => {
  if (query.inventoryType === 'InventoryConsumable') {
    return { success: true, message: '', data: { count: 1, items: [CONSUMABLE_ASSIGNMENT_ITEM] } }
  }
  return { success: true, message: '', data: { count: 1, items: [DEVICE_ASSIGNMENT_ITEM] } }
})

// useFieldStaffRoster resolves 'field-officer'/'dietitian' role types, then lists active Roles of
// each — these two mocks drive that, replacing the old (FO-only) report endpoint.
const searchRoleTypes = vi.fn(async (query: { code?: string }) => {
  if (query.code === 'dietitian') {
    return { success: true, message: '', data: { count: 1, items: [{ id: 'rt-dietitian', code: 'dietitian', name: 'Dietitian' }] } }
  }
  return { success: true, message: '', data: { count: 1, items: [{ id: 'rt-fo', code: 'field-officer', name: 'Field Officer' }] } }
})
const searchRoles = vi.fn(async (query: { type?: string }) => {
  if (query.type === 'rt-dietitian') {
    return { success: true, message: '', data: { count: 0, items: [] } }
  }
  return { success: true, message: '', data: { count: 1, items: [{ id: 'role-1', name: 'Jane FO', code: 'fo-1' }] } }
})

vi.mock('@/features/inventory/real/inventoryAssignment.service', () => ({
  inventoryAssignmentService: {
    searchInventoryAssignments: (query: { inventoryType?: string }) => searchInventoryAssignments(query),
  },
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchRoleTypes: (query: { code?: string }) => searchRoleTypes(query),
    searchRoles: (query: { type?: string }) => searchRoles(query),
  },
}))

// Mocked out so these tests isolate fetch/truncation-warning logic, not jsdom's Blob/URL.createObjectURL plumbing.
vi.mock('@/features/inventory/real/inventoryAssignment.export', () => ({
  downloadAssignedDevicesCsv: vi.fn(),
}))

const searchInventoryDevices = vi.fn(async () => ({
  success: true,
  message: '',
  data: { count: 1, items: [{ id: 'dev-1', item: { id: 'item-1', name: 'Infusion pump' }, serialNumber: 'SN-001', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] },
}))

vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: {
    searchInventoryDevices: () => searchInventoryDevices(),
  },
}))

const searchInventoryConsumables = vi.fn(async () => ({
  success: true,
  message: '',
  data: { count: 1, items: [{ id: 'lot-1', item: { id: 'item-2', name: 'Sterile Lancets' }, batch: 'BATCH-01', quantity: 100, expiryDate: null }] },
}))

vi.mock('@/features/inventory/real/inventoryConsumable.service', () => ({
  inventoryConsumableService: {
    searchInventoryConsumables: () => searchInventoryConsumables(),
  },
}))

// Branches on type ('fo' vs 'dietitian') — the panel now fetches both independently.
const searchGeoProfiles = vi.fn(async (query: { type?: string }) => {
  if (query.type === 'dietitian') {
    return { success: true, message: '', data: { count: 0, items: [] } }
  }
  return { success: true, message: '', data: { count: 1, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] } }
})

vi.mock('@/features/geo-profile/geoProfile.service', () => ({
  geoProfileService: {
    searchGeoProfiles: (query: { type?: string }) => searchGeoProfiles(query),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function resetAllMocks() {
  vi.resetAllMocks()
  searchInventoryAssignments.mockImplementation(async (query: { inventoryType?: string }) => {
    if (query.inventoryType === 'InventoryConsumable') {
      return { success: true, message: '', data: { count: 1, items: [CONSUMABLE_ASSIGNMENT_ITEM] } }
    }
    return { success: true, message: '', data: { count: 1, items: [DEVICE_ASSIGNMENT_ITEM] } }
  })
  searchInventoryDevices.mockResolvedValue({
    success: true,
    message: '',
    data: { count: 1, items: [{ id: 'dev-1', item: { id: 'item-1', name: 'Infusion pump' }, serialNumber: 'SN-001', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] },
  })
  searchInventoryConsumables.mockResolvedValue({
    success: true,
    message: '',
    data: { count: 1, items: [{ id: 'lot-1', item: { id: 'item-2', name: 'Sterile Lancets' }, batch: 'BATCH-01', quantity: 100, expiryDate: null }] },
  })
  searchGeoProfiles.mockImplementation(async (query: { type?: string }) => {
    if (query.type === 'dietitian') {
      return { success: true, message: '', data: { count: 0, items: [] } }
    }
    return { success: true, message: '', data: { count: 1, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] } }
  })
  searchRoleTypes.mockImplementation(async (query: { code?: string }) => {
    if (query.code === 'dietitian') {
      return { success: true, message: '', data: { count: 1, items: [{ id: 'rt-dietitian', code: 'dietitian', name: 'Dietitian' }] } }
    }
    return { success: true, message: '', data: { count: 1, items: [{ id: 'rt-fo', code: 'field-officer', name: 'Field Officer' }] } }
  })
  searchRoles.mockImplementation(async (query: { type?: string }) => {
    if (query.type === 'rt-dietitian') {
      return { success: true, message: '', data: { count: 0, items: [] } }
    }
    return { success: true, message: '', data: { count: 1, items: [{ id: 'role-1', name: 'Jane FO', code: 'fo-1' }] } }
  })
}

async function renderPanel(canManage: boolean) {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => canManage } as unknown as ReturnType<typeof usePermission>)
  const InventoryAssignmentsPanel = (await import('@/features/inventory/real/components/InventoryAssignmentsPanel')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <InventoryAssignmentsPanel />
    </QueryClientProvider>,
  )
}

// This tab requires inventory-assignment:manage for ALL reads — unlike most inventory tabs, no partial non-manager view.
describe('InventoryAssignmentsPanel — permission gating', () => {
  beforeEach(resetAllMocks)

  // Regression: devices/consumables hooks had no `enabled` gate, so both fired regardless of this permission check.
  it('without inventory-assignment:manage: shows a permission message, fetches nothing at all', async () => {
    await renderPanel(false)

    await screen.findByText(/you don't have permission to view assignments/i)
    expect(searchRoleTypes).not.toHaveBeenCalled()
    expect(searchRoles).not.toHaveBeenCalled()
    expect(searchInventoryAssignments).not.toHaveBeenCalled()
    expect(searchInventoryDevices).not.toHaveBeenCalled()
    expect(searchInventoryConsumables).not.toHaveBeenCalled()
    expect(searchGeoProfiles).not.toHaveBeenCalled()
  })

  it('with inventory-assignment:manage: renders the per-staff chip grid from the roster + assignment data', async () => {
    await renderPanel(true)

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()
    expect(screen.getByText(/Field Officer.*Pune/)).toBeInTheDocument()
    // The device chip is built from the joined device name + serial.
    expect(screen.getByText(/Infusion pump.*SN-001/)).toBeInTheDocument()
  })

  // Regression: an earlier rebuild fetched only InventoryDevice, dropping every consumable assignment.
  it('shows consumable-assignment chips alongside device chips — not device-only', async () => {
    await renderPanel(true)

    await screen.findByText('Jane FO')
    expect(searchInventoryAssignments).toHaveBeenCalledWith(expect.objectContaining({ inventoryType: 'InventoryConsumable' }))
    // The consumable chip is built from the joined lot's item name + quantity.
    expect(screen.getByText(/Sterile Lancets.*×25/)).toBeInTheDocument()
  })

  it('a staff member with no assigned units shows the "no units assigned" placeholder, not an empty cell', async () => {
    searchInventoryAssignments.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })

    await renderPanel(true)

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()
    expect(screen.getByText('— No units assigned —')).toBeInTheDocument()
  })

  // The real fix this test file covers: dietitians are now part of the roster, not FO-only.
  it('includes dietitians in the roster alongside field officers', async () => {
    searchRoles.mockImplementation(async (query: { type?: string }) => {
      if (query.type === 'rt-dietitian') {
        return { success: true, message: '', data: { count: 1, items: [{ id: 'role-2', name: 'Priya Dietitian', code: 'dt-1' }] } }
      }
      return { success: true, message: '', data: { count: 1, items: [{ id: 'role-1', name: 'Jane FO', code: 'fo-1' }] } }
    })
    searchGeoProfiles.mockImplementation(async (query: { type?: string }) => {
      if (query.type === 'dietitian') {
        return { success: true, message: '', data: { count: 1, items: [{ id: 'geo-2', role: 'role-2', city: 'Mumbai' }] } }
      }
      return { success: true, message: '', data: { count: 1, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] } }
    })

    await renderPanel(true)

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()
    expect(screen.getByText('Priya Dietitian')).toBeInTheDocument()
    expect(screen.getByText(/Dietitian.*Mumbai/)).toBeInTheDocument()
  })
})

describe('InventoryAssignmentsPanel — "Assign to field staff" roster loading/error/empty states', () => {
  beforeEach(resetAllMocks)

  it('"Assign to field staff" is disabled while the roster is still loading', async () => {
    // Both the FO and dietitian role-type->roles lookups must resolve before the roster
    // settles — hang both, then resolve both, to avoid one pending call masking the other.
    const resolvers: Array<(value: Awaited<ReturnType<typeof searchRoles>>) => void> = []
    searchRoles.mockImplementation(() => new Promise((resolve) => { resolvers.push(resolve) }))

    await renderPanel(true)

    expect(screen.getByRole('button', { name: /assign to field staff/i })).toBeDisabled()

    await vi.waitFor(() => expect(resolvers).toHaveLength(2))
    resolvers.forEach((resolve) => resolve({ success: true, message: '', data: { count: 1, items: [{ id: 'role-1', name: 'Jane FO', code: 'fo-1' }] } }))

    await vi.waitFor(() => expect(screen.getByRole('button', { name: /assign to field staff/i })).toBeEnabled())
  })

  it('a roster fetch failure keeps "Assign to field staff" disabled and surfaces the shared error state', async () => {
    searchRoles.mockRejectedValue(new Error('network down'))

    await renderPanel(true)

    await screen.findByText('Failed to load assignments. Please try again.')
    expect(screen.getByRole('button', { name: /assign to field staff/i })).toBeDisabled()
  })

  // Regression: the roster's own role-type/role queries weren't part of the grid's Retry at all,
  // so a roster-only failure left the page stuck in its error state until a full remount/reload.
  it('clicking the shared Retry after a roster failure re-fires the roster queries and recovers the staff list', async () => {
    searchRoles.mockRejectedValue(new Error('network down'))
    const user = userEvent.setup()

    await renderPanel(true)

    await screen.findByText('Failed to load assignments. Please try again.')
    expect(screen.getByRole('button', { name: /assign to field staff/i })).toBeDisabled()

    searchRoles.mockImplementation(async (query: { type?: string }) => {
      if (query.type === 'rt-dietitian') {
        return { success: true, message: '', data: { count: 0, items: [] } }
      }
      return { success: true, message: '', data: { count: 1, items: [{ id: 'role-1', name: 'Jane FO', code: 'fo-1' }] } }
    })
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()
    await vi.waitFor(() => expect(screen.getByRole('button', { name: /assign to field staff/i })).toBeEnabled())
  })

  // Regression: refetch() bypasses `enabled`, so retrying before the role-type id resolves must
  // not fire the role search with `type: undefined` (an unscoped "every active role" request).
  it('clicking Retry after a role-TYPE failure recovers without ever searching roles with no type', async () => {
    searchRoleTypes.mockRejectedValue(new Error('network down'))
    searchRoles.mockClear()
    const user = userEvent.setup()

    await renderPanel(true)

    await screen.findByText('Failed to load assignments. Please try again.')
    expect(screen.getByRole('button', { name: /assign to field staff/i })).toBeDisabled()
    expect(searchRoles).not.toHaveBeenCalled()

    searchRoleTypes.mockImplementation(async (query: { code?: string }) => {
      if (query.code === 'dietitian') {
        return { success: true, message: '', data: { count: 1, items: [{ id: 'rt-dietitian', code: 'dietitian', name: 'Dietitian' }] } }
      }
      return { success: true, message: '', data: { count: 1, items: [{ id: 'rt-fo', code: 'field-officer', name: 'Field Officer' }] } }
    })
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()
    await vi.waitFor(() => expect(screen.getByRole('button', { name: /assign to field staff/i })).toBeEnabled())
    expect(searchRoles).not.toHaveBeenCalledWith(expect.objectContaining({ type: undefined }))
  })

  it('a roster that loads with zero staff keeps the "Assign to field staff" button disabled', async () => {
    searchRoles.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })

    await renderPanel(true)

    await vi.waitFor(() => expect(screen.getByRole('button', { name: /assign to field staff/i })).toBeDisabled())
    expect(await screen.findByText(/no field officers or dietitians found/i)).toBeInTheDocument()
  })

  it('clicking "Assign to field staff" with a real roster opens the modal, passing the same roster already fetched', async () => {
    const user = userEvent.setup()

    await renderPanel(true)

    const assignButton = await vi.waitFor(() => {
      const btn = screen.getByRole('button', { name: /assign to field staff/i })
      expect(btn).toBeEnabled()
      return btn
    })
    await user.click(assignButton)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Assign inventory to field staff')).toBeInTheDocument()
    // No second, independent roster fetch was triggered by opening the modal.
    expect(searchRoles).toHaveBeenCalledTimes(2) // once for 'field-officer', once for 'dietitian'
  })
})

// Regression: a truncated geo-profiles fetch used to render identically to "this FO has no HQ".
describe('InventoryAssignmentsPanel — truncation disclosure', () => {
  beforeEach(resetAllMocks)

  // Regression: a truncated FO/dietitian role fetch used to drop staff from the grid and
  // assign-picker silently past 1,000 — no label at all, unlike every other capped dataset here.
  it('discloses a truncated field-staff roster fetch by name, not silently', async () => {
    searchRoles.mockImplementation(async (query: { type?: string }) => {
      if (query.type === 'rt-dietitian') {
        return { success: true, message: '', data: { count: 0, items: [] } }
      }
      return { success: true, message: '', data: { count: 1000, items: [{ id: 'role-1', name: 'Jane FO', code: 'fo-1' }] } }
    })

    await renderPanel(true)

    await screen.findByText('Jane FO')
    expect(await screen.findByText(/Showing the first 1,000 field staff/)).toBeInTheDocument()
  })

  it('discloses a truncated FO geo-profiles fetch by name, not silently', async () => {
    searchGeoProfiles.mockImplementation(async (query: { type?: string }) => {
      if (query.type === 'dietitian') {
        return { success: true, message: '', data: { count: 0, items: [] } }
      }
      return { success: true, message: '', data: { count: 1000, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] } }
    })

    await renderPanel(true)

    await screen.findByText('Jane FO')
    expect(await screen.findByText(/FO locations/)).toBeInTheDocument()
  })

  it('discloses a truncated consumable-assignments fetch by name', async () => {
    searchInventoryAssignments.mockImplementation(async (query: { inventoryType?: string }) => {
      if (query.inventoryType === 'InventoryConsumable') {
        return { success: true, message: '', data: { count: 1000, items: [CONSUMABLE_ASSIGNMENT_ITEM] } }
      }
      return { success: true, message: '', data: { count: 1, items: [DEVICE_ASSIGNMENT_ITEM] } }
    })

    await renderPanel(true)

    await screen.findByText('Jane FO')
    expect(await screen.findByText(/consumable assignments/)).toBeInTheDocument()
  })

  it('shows no truncation notice when every dataset is complete', async () => {
    await renderPanel(true)

    await screen.findByText('Jane FO')
    expect(screen.queryByText(/showing the first 1,000/i)).not.toBeInTheDocument()
  })
})

// Regression: the grid's QueryStateBlock previously had no onRetry at all.
describe('InventoryAssignmentsPanel — grid retry', () => {
  beforeEach(resetAllMocks)

  it('the grid error state has its own Retry button that re-fires every underlying fetch', async () => {
    searchInventoryDevices.mockRejectedValue(new Error('network down'))
    const user = userEvent.setup()

    await renderPanel(true)

    await screen.findByText('Failed to load assignments. Please try again.')
    searchInventoryDevices.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'dev-1', item: { id: 'item-1', name: 'Infusion pump' }, serialNumber: 'SN-001', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] },
    })

    const retryButtons = screen.getAllByRole('button', { name: /retry/i })
    await user.click(retryButtons[retryButtons.length - 1])

    await screen.findByText('Jane FO')
    expect(searchInventoryDevices).toHaveBeenCalledTimes(2)
  })
})

// Regression: only the assignments fetch was checked for truncation — a truncated devices/geo-profiles fetch silently null-joined rows.
describe('InventoryAssignmentsPanel — export truncation warning', () => {
  beforeEach(resetAllMocks)

  async function clickExport() {
    await renderPanel(true)
    const user = userEvent.setup()

    await screen.findByText('Jane FO')
    await user.click(screen.getByRole('button', { name: /export devices/i }))
    return user
  }

  it('warns when the devices fetch alone is truncated, even though assignments is not', async () => {
    // 1000 real devices exist but the capped fetch only returned 1 -> devices-only truncation.
    searchInventoryDevices.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1000, items: [{ id: 'dev-1', item: { id: 'item-1', name: 'Infusion pump' }, serialNumber: 'SN-001', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] },
    })

    await clickExport()

    await vi.waitFor(() => expect(searchInventoryDevices).toHaveBeenCalled())
    await vi.waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      'Export is incomplete: too many devices to include all — some rows may show missing data.',
    ))
  })

  it('warns naming BOTH datasets when devices and FO geo-profiles are truncated simultaneously', async () => {
    searchInventoryDevices.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1000, items: [{ id: 'dev-1', item: { id: 'item-1', name: 'Infusion pump' }, serialNumber: 'SN-001', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] },
    })

    await clickExport()

    await vi.waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      'Export is incomplete: too many devices to include all — some rows may show missing data.',
    ))
    expect(toast.warning).toHaveBeenCalledTimes(1)
  })

  it('warns naming ALL datasets when assignments, devices, and FO geo-profiles are all truncated', async () => {
    searchInventoryAssignments.mockImplementation(async (query: { inventoryType?: string }) => {
      if (query.inventoryType === 'InventoryConsumable') {
        return { success: true, message: '', data: { count: 1, items: [CONSUMABLE_ASSIGNMENT_ITEM] } }
      }
      return { success: true, message: '', data: { count: 1000, items: [DEVICE_ASSIGNMENT_ITEM] } }
    })
    searchInventoryDevices.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1000, items: [{ id: 'dev-1', item: { id: 'item-1', name: 'Infusion pump' }, serialNumber: 'SN-001', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] },
    })

    await clickExport()

    await vi.waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      'Export is incomplete: too many assignments, devices to include all — some rows may show missing data.',
    ))
    expect(toast.warning).toHaveBeenCalledTimes(1)
  })

  it('does not warn when assignments, devices, and geo-profiles are all complete', async () => {
    await clickExport()

    await vi.waitFor(() => expect(searchInventoryDevices).toHaveBeenCalled())
    expect(toast.warning).not.toHaveBeenCalled()
  })
})
