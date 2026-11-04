import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { InventoryMasterEntity } from '@/types/inventoryMaster.types'

vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: { searchInventoryDevices: vi.fn() },
}))

vi.mock('@/features/inventory/real/inventoryConsumable.service', () => ({
  inventoryConsumableService: {
    searchInventoryConsumables: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [{
          id: 'lot-1',
          item: { id: 'item-consumable', code: 'GLV-NTR-M', name: 'Nitrile Gloves', sku: 'GLV-NTR-M', unit: 'box' },
          vendor: { id: 'vendor-1', code: 'GEN', name: 'Generic' },
          batch: 'BGLVNTRM-24001',
          manufacturingDate: '2026-05-02T00:00:00.000Z',
          expiryDate: '2027-08-15T00:00:00.000Z',
          quantity: 188,
          status: 'active',
          createdAt: '2026-05-02T00:00:00.000Z',
          updatedAt: '2026-05-02T00:00:00.000Z',
        }],
      },
    })),
  },
}))

const item: InventoryMasterEntity = {
  id: 'item-consumable',
  code: 'GLV-NTR-M',
  name: 'Nitrile Gloves (M, pack 100)',
  description: 'Disposable nitrile examination gloves.',
  type: 'consumable',
  sku: 'GLV-NTR-M',
  unit: 'box',
  minStock: 80,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-05-02T00:00:00.000Z',
}

describe('InventoryMasterDetailDrawer — consumable details', () => {
  it('shows the real catalog and stock-lot fields available from the backend', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const InventoryMasterDetailDrawer = (await import('./InventoryMasterDetailDrawer')).default

    render(
      <QueryClientProvider client={client}>
        <InventoryMasterDetailDrawer item={item} canManage={false} onClose={vi.fn()} onEdit={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { name: item.name })).toBeInTheDocument()
    expect(screen.getAllByText('Reorder level').length).toBeGreaterThan(0)
    expect(screen.getByText('80 box')).toBeInTheDocument()
    expect(await screen.findByText('Stock lots (1)')).toBeInTheDocument()
    expect(screen.getByText('BGLVNTRM-24001')).toBeInTheDocument()
    expect(screen.getByText('Generic')).toBeInTheDocument()
    expect(screen.getByText('188 box')).toBeInTheDocument()
    expect(screen.getByText('2026-05-02')).toBeInTheDocument()
    expect(screen.getByText('2027-08-15')).toBeInTheDocument()
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()

    const { inventoryConsumableService } = await import('@/features/inventory/real/inventoryConsumable.service')
    expect(inventoryConsumableService.searchInventoryConsumables).toHaveBeenCalledWith({
      item: item.id,
      page: '1',
      limit: '10',
    })
  })
})
