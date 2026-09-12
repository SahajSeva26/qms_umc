import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { InventoryMasterEntity } from '@/types/inventoryMaster.types'

vi.mock('@/hooks/usePermission')

vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: {
    searchInventoryMasters: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [
          {
            id: 'item-1',
            code: 'DEV-SYR-01',
            name: 'Syringe pump',
            description: '',
            type: 'device',
            sku: 'sku-001',
            unit: 'unit',
            minStock: 12,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            status: 'active',
          } satisfies InventoryMasterEntity,
        ],
      },
    })),
    getInventoryMasterReport: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        summary: { catalogItems: 55 },
        catalog: {
          byType: [
            { type: 'device', count: 30 },
            { type: 'consumable', count: 25 },
          ],
          byStatus: [
            { status: 'active', count: 50 },
            { status: 'inactive', count: 5 },
          ],
        },
      },
    })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('InventoryMasterTab — report gating', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('non-manager: report strip is hidden and the report endpoint is never called', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => false } as unknown as ReturnType<typeof usePermission>)

    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const InventoryMasterTab = (await import('@/features/inventory/real/components/InventoryMasterTab')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryMasterTab />
      </QueryClientProvider>,
    )

    await screen.findByText('Syringe pump')
    expect(inventoryMasterService.getInventoryMasterReport).not.toHaveBeenCalled()
    expect(screen.queryByText('Catalog Items')).not.toBeInTheDocument()
  })

  it('manager: report strip renders real counts from the report response, not the paginated list', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)

    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const InventoryMasterTab = (await import('@/features/inventory/real/components/InventoryMasterTab')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryMasterTab />
      </QueryClientProvider>,
    )

    await screen.findByText('Catalog Items')
    expect(inventoryMasterService.getInventoryMasterReport).toHaveBeenCalled()
    // 55 (catalogItems) only exists in the report — the paginated list fixture has count: 1
    expect(screen.getByText('55')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
