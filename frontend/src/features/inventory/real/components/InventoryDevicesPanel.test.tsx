import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { InventoryDeviceEntity } from '@/types/inventoryDevice.types'

vi.mock('@/hooks/usePermission')

vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: {
    searchInventoryDevices: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [
          {
            id: 'dev-1',
            item: { id: 'item-1', code: 'DEV-01', name: 'Infusion pump' },
            vendor: null,
            serialNumber: 'SN-0099',
            status: 'assigned',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          } satisfies InventoryDeviceEntity,
        ],
      },
    })),
    getInventoryDeviceReport: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        summary: { totalDevices: 88 },
        devices: {
          byStatus: [
            { status: 'available', count: 40 },
            { status: 'in-transit', count: 3 },
            { status: 'assigned', count: 35 },
            { status: 'maintainance', count: 6 },
            { status: 'lost', count: 2 },
            { status: 'damaged', count: 2 },
          ],
        },
      },
    })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('InventoryDevicesPanel — report gating', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('non-manager: report strip is hidden and the report endpoint is never called', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => false } as unknown as ReturnType<typeof usePermission>)

    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    const InventoryDevicesPanel = (await import('@/features/inventory/real/components/InventoryDevicesPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryDevicesPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('SN-0099')
    expect(inventoryDeviceService.getInventoryDeviceReport).not.toHaveBeenCalled()
    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument()
  })

  it('manager: report strip renders real counts (incl. the Needs attention rollup) from the report response, not the paginated list', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)

    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    const InventoryDevicesPanel = (await import('@/features/inventory/real/components/InventoryDevicesPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryDevicesPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('Needs attention')
    expect(inventoryDeviceService.getInventoryDeviceReport).toHaveBeenCalled()
    // 88 (totalDevices) only exists in the report — the paginated list fixture has count: 1
    expect(screen.getByText('88')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('35')).toBeInTheDocument()
    // Needs attention = maintainance(6) + lost(2) + damaged(2) = 10, a client-side sum not present verbatim in the fixture.
    expect(screen.getByText('10')).toBeInTheDocument()
  })
})
