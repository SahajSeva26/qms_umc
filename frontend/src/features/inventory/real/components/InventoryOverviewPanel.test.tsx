import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'

vi.mock('@/hooks/usePermission')

const getInventoryMasterReport = vi.fn()
const getInventoryDeviceReport = vi.fn()
const getInventoryConsumableReport = vi.fn()

vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: { getInventoryMasterReport: () => getInventoryMasterReport() },
}))
vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: { getInventoryDeviceReport: () => getInventoryDeviceReport() },
}))
vi.mock('@/features/inventory/real/inventoryConsumable.service', () => ({
  inventoryConsumableService: { getInventoryConsumableReport: () => getInventoryConsumableReport() },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPanel() {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)
  const InventoryOverviewPanel = (await import('./InventoryOverviewPanel')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <InventoryOverviewPanel />
    </QueryClientProvider>,
  )
}

// Regression: a failed fetch used to render identically to "No devices yet." — must show a distinct retry message.
describe('InventoryOverviewPanel — error vs. genuinely empty', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('a report fetch failure shows an error message, not zero-valued bars', async () => {
    getInventoryMasterReport.mockRejectedValue(new Error('network down'))
    getInventoryDeviceReport.mockResolvedValue({ success: true, message: '', data: { summary: { totalDevices: 0 }, devices: { byStatus: [] } } })
    getInventoryConsumableReport.mockResolvedValue({ success: true, message: '', data: { summary: { consumableLots: 0, warehouseConsumableQuantity: 0 }, consumables: { warehouseQuantity: 0, expiredByDate: 0, byStatus: [] } } })

    await renderPanel()

    await screen.findByText(/couldn't load the overview/i)
    expect(screen.queryByText('No devices yet.')).not.toBeInTheDocument()
  })

  it('a genuinely empty organisation (real zero counts, no fetch error) shows the empty-state label', async () => {
    getInventoryMasterReport.mockResolvedValue({ success: true, message: '', data: { summary: { catalogItems: 0 }, catalog: { byType: [], byStatus: [] } } })
    getInventoryDeviceReport.mockResolvedValue({ success: true, message: '', data: { summary: { totalDevices: 0 }, devices: { byStatus: [] } } })
    getInventoryConsumableReport.mockResolvedValue({ success: true, message: '', data: { summary: { consumableLots: 0, warehouseConsumableQuantity: 0 }, consumables: { warehouseQuantity: 0, expiredByDate: 0, byStatus: [] } } })

    await renderPanel()

    await screen.findByText('No devices yet.')
    expect(screen.queryByText(/couldn't load the overview/i)).not.toBeInTheDocument()
  })
})
