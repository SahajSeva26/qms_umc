import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/hooks/usePermission')

vi.mock('@/features/inventory/real/inventoryConsumable.service', () => ({
  inventoryConsumableService: {
    searchInventoryConsumables: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [{
          id: 'lot-1',
          item: { id: 'item-1', code: 'ALC-SWB-100', name: 'Alcohol Swabs (pack 100)', sku: 'SWB-100', unit: 'pack' },
          vendor: { id: 'vendor-1', code: 'VEN-GENERIC', name: 'Generic' },
          batch: 'BALCSWB100-24008',
          manufacturingDate: '2026-04-02T00:00:00.000Z',
          expiryDate: '2027-10-10T00:00:00.000Z',
          quantity: 318,
          status: 'active',
          createdAt: '2026-04-02T00:00:00.000Z',
          updatedAt: '2026-04-02T00:00:00.000Z',
        }],
      },
    })),
    updateInventoryConsumable: vi.fn(),
    createInventoryConsumable: vi.fn(),
  },
}))

vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: {
    getInventoryMaster: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        id: 'item-1',
        code: 'ALC-SWB-100',
        name: 'Alcohol Swabs (pack 100)',
        description: 'Sterile alcohol swab pack',
        type: 'consumable',
        sku: 'SWB-100',
        unit: 'pack',
        minStock: 80,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    })),
  },
}))

const renderPanel = async () => {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)
  const InventoryExpiryPanel = (await import('./InventoryExpiryPanel')).default
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <InventoryExpiryPanel />
    </QueryClientProvider>,
  )
}

describe('InventoryExpiryPanel detail drawer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens from a FEFO row and enriches the real lot with catalog details', async () => {
    const user = userEvent.setup()
    await renderPanel()

    const row = await screen.findByLabelText(/view details for alcohol swabs/i)
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    expect(inventoryMasterService.getInventoryMaster).not.toHaveBeenCalled()

    await user.click(row)

    expect(await screen.findByText('Identity')).toBeInTheDocument()
    expect(await screen.findByText('Sterile alcohol swab pack')).toBeInTheDocument()
    expect(screen.getByText('Commercial')).toBeInTheDocument()
    expect(screen.getByText('Batch · Expiry')).toBeInTheDocument()
    expect(screen.getByText('VEN-GENERIC')).toBeInTheDocument()
    expect(screen.getAllByText('318 pack').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(inventoryMasterService.getInventoryMaster).toHaveBeenCalledWith('item-1')

    expect(screen.queryByText('Purchase cost')).not.toBeInTheDocument()
    expect(screen.queryByText('GST %')).not.toBeInTheDocument()
    expect(screen.queryByText('Storage')).not.toBeInTheDocument()
    expect(screen.queryByText('Linked device')).not.toBeInTheDocument()
  })
})
