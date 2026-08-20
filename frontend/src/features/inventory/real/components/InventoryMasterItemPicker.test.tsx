import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: {
    searchInventoryMasters: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('InventoryMasterItemPicker', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('scopes the catalog search to type=device when used for a device', async () => {
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const InventoryMasterItemPicker = (await import('@/features/inventory/real/components/InventoryMasterItemPicker')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryMasterItemPicker type="device" value="" label="" onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    const input = screen.getByPlaceholderText(/search catalog item/i)
    await user.type(input, 'glucometer')

    await vi.waitFor(() =>
      expect(inventoryMasterService.searchInventoryMasters).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'device', name: 'glucometer' }),
      ),
    )
    // Never called with the other type for this instance.
    expect(inventoryMasterService.searchInventoryMasters).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'consumable' }),
    )
  })

  it('scopes the catalog search to type=consumable when used for a consumable', async () => {
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const InventoryMasterItemPicker = (await import('@/features/inventory/real/components/InventoryMasterItemPicker')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryMasterItemPicker type="consumable" value="" label="" onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    const input = screen.getByPlaceholderText(/search catalog item/i)
    await user.type(input, 'syringe')

    await vi.waitFor(() =>
      expect(inventoryMasterService.searchInventoryMasters).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'consumable', name: 'syringe' }),
      ),
    )
    expect(inventoryMasterService.searchInventoryMasters).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'device' }),
    )
  })

  // A failed search must not look identical to "no results."
  it('a failed search shows an explicit error message, not the "no matching items" empty state', async () => {
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    vi.mocked(inventoryMasterService.searchInventoryMasters).mockRejectedValue(new Error('network down'))
    const InventoryMasterItemPicker = (await import('@/features/inventory/real/components/InventoryMasterItemPicker')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryMasterItemPicker type="device" value="" label="" onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    const input = screen.getByPlaceholderText(/search catalog item/i)
    await user.type(input, 'glucometer')

    await screen.findByText(/couldn't search the catalog/i)
    expect(screen.queryByText(/no matching catalog items found/i)).not.toBeInTheDocument()
  })

  it('retrying a failed search re-fires the query with the same term', async () => {
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    vi.mocked(inventoryMasterService.searchInventoryMasters).mockRejectedValueOnce(new Error('network down'))
    const InventoryMasterItemPicker = (await import('@/features/inventory/real/components/InventoryMasterItemPicker')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryMasterItemPicker type="device" value="" label="" onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    const input = screen.getByPlaceholderText(/search catalog item/i)
    await user.type(input, 'glucometer')
    await screen.findByText(/couldn't search the catalog/i)

    vi.mocked(inventoryMasterService.searchInventoryMasters).mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'm1', code: 'ACGLU-001', name: 'Glucometer', description: '', type: 'device', sku: '', unit: '', minStock: 0, maxStock: 0, createdAt: '', updatedAt: '' }] },
    })

    await user.click(screen.getByRole('button', { name: /retry/i }))
    await screen.findByText('Glucometer (ACGLU-001)')
  })
})
