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
    searchInventoryAssignments: (query: { inventoryType?: string }) => searchInventoryAssignments(query),
    getInventoryAssignmentReport: () => getInventoryAssignmentReport(),
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

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

const ROSTER_FO = { role: 'role-1', name: 'Jane FO', code: 'fo-1', devicesHeld: 1, consumableUnitsHeld: 25, awaitingApproval: 0, awaitingReceipt: 0 }

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
  searchGeoProfiles.mockResolvedValue({ success: true, message: '', data: { count: 1, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] } })
  getInventoryAssignmentReport.mockResolvedValue({
    success: true,
    message: '',
    data: { summary: { totalFieldOfficers: 1, fieldOfficersHoldingInventory: 1 }, fieldOfficers: [ROSTER_FO] },
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
    expect(getInventoryAssignmentReport).not.toHaveBeenCalled()
    expect(searchInventoryAssignments).not.toHaveBeenCalled()
    expect(searchInventoryDevices).not.toHaveBeenCalled()
    expect(searchInventoryConsumables).not.toHaveBeenCalled()
    expect(searchGeoProfiles).not.toHaveBeenCalled()
  })

  it('with inventory-assignment:manage: renders the per-FO chip grid from real report + assignment data', async () => {
    await renderPanel(true)

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()
    expect(screen.getByText('Pune')).toBeInTheDocument()
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

  it('an FO with no assigned units shows the "no units assigned" placeholder, not an empty cell', async () => {
    getInventoryAssignmentReport.mockResolvedValue({
      success: true,
      message: '',
      data: { summary: { totalFieldOfficers: 1, fieldOfficersHoldingInventory: 0 }, fieldOfficers: [{ ...ROSTER_FO, devicesHeld: 0, consumableUnitsHeld: 0 }] },
    })
    searchInventoryAssignments.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })

    await renderPanel(true)

    expect(await screen.findByText('Jane FO')).toBeInTheDocument()
    expect(screen.getByText('— No units assigned —')).toBeInTheDocument()
  })
})

describe('InventoryAssignmentsPanel — "Assign to FO" roster loading/error/empty states', () => {
  beforeEach(resetAllMocks)

  it('"Assign to FO" is disabled while the roster is still loading', async () => {
    let resolveReport: (value: Awaited<ReturnType<typeof getInventoryAssignmentReport>>) => void = () => {}
    getInventoryAssignmentReport.mockImplementation(() => new Promise((resolve) => { resolveReport = resolve }))

    await renderPanel(true)

    expect(screen.getByRole('button', { name: /assign to fo/i })).toBeDisabled()

    resolveReport({
      success: true,
      message: '',
      data: { summary: { totalFieldOfficers: 1, fieldOfficersHoldingInventory: 0 }, fieldOfficers: [ROSTER_FO] },
    })

    await vi.waitFor(() => expect(screen.getByRole('button', { name: /assign to fo/i })).toBeEnabled())
  })

  it('a roster fetch failure shows a retryable error, and Retry calls the report hook again', async () => {
    getInventoryAssignmentReport.mockRejectedValueOnce(new Error('network down'))
    getInventoryAssignmentReport.mockResolvedValue({
      success: true,
      message: '',
      data: { summary: { totalFieldOfficers: 1, fieldOfficersHoldingInventory: 0 }, fieldOfficers: [ROSTER_FO] },
    })
    const user = userEvent.setup()

    await renderPanel(true)

    const bannerText = await screen.findByText("Couldn't load field officers.")
    expect(screen.getByRole('button', { name: /assign to fo/i })).toBeDisabled()

    // Two Retry buttons now exist (this banner's own, and the grid's) — scope to this one.
    const inlineRetry = bannerText.parentElement!.querySelector('button')!
    await user.click(inlineRetry)

    await vi.waitFor(() => expect(screen.getByRole('button', { name: /assign to fo/i })).toBeEnabled())
    expect(getInventoryAssignmentReport).toHaveBeenCalledTimes(2)
  })

  it('a roster that loads with zero FOs keeps the "Assign to FO" button disabled', async () => {
    getInventoryAssignmentReport.mockResolvedValue({
      success: true,
      message: '',
      data: { summary: { totalFieldOfficers: 0, fieldOfficersHoldingInventory: 0 }, fieldOfficers: [] },
    })

    await renderPanel(true)

    await vi.waitFor(() => expect(screen.getByRole('button', { name: /assign to fo/i })).toBeDisabled())
  })

  it('clicking "Assign to FO" with a real roster opens the modal, passing the same fieldOfficers already fetched', async () => {
    const user = userEvent.setup()

    await renderPanel(true)

    const assignButton = await vi.waitFor(() => {
      const btn = screen.getByRole('button', { name: /assign to fo/i })
      expect(btn).toBeEnabled()
      return btn
    })
    await user.click(assignButton)

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Assign inventory to FO')).toBeInTheDocument()
    // No second, independent report/roster fetch was triggered by opening the modal.
    expect(getInventoryAssignmentReport).toHaveBeenCalledTimes(1)
  })
})

// Regression: a truncated geo-profiles fetch used to render identically to "this FO has no HQ".
describe('InventoryAssignmentsPanel — truncation disclosure', () => {
  beforeEach(resetAllMocks)

  it('discloses a truncated geo-profiles fetch by name, not silently', async () => {
    searchGeoProfiles.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1000, items: [{ id: 'geo-1', role: 'role-1', city: 'Pune' }] },
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

  it('warns naming BOTH datasets when devices and geo-profiles are truncated simultaneously', async () => {
    searchInventoryDevices.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1000, items: [{ id: 'dev-1', item: { id: 'item-1', name: 'Infusion pump' }, serialNumber: 'SN-001', status: 'assigned', lastCalibrationDate: null, nextCalibrationDate: null }] },
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
