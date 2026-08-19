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
})
