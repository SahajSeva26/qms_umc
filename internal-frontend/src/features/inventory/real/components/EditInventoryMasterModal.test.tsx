import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InventoryMasterEntity } from '@/types/inventoryMaster.types'

vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: {
    createInventoryMaster: vi.fn(async () => ({ success: true, message: '', data: { id: 'item-new' } })),
    updateInventoryMaster: vi.fn(async () => ({ success: true, message: '', data: { id: 'item-1' } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function itemFixture(overrides: Partial<InventoryMasterEntity> = {}): InventoryMasterEntity {
  return {
    id: 'item-1',
    code: 'syr-01',
    name: 'Syringe 5ml',
    description: 'Sterile disposable syringe',
    type: 'consumable',
    sku: 'SKU-100',
    unit: 'piece',
    minStock: 50,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('EditInventoryMasterModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('edit mode: saving without touching any field omits all 7 — never resends a stale snapshot to clobber a concurrent edit', async () => {
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const EditInventoryMasterModal = (await import('@/features/inventory/real/components/EditInventoryMasterModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const item = itemFixture()

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryMasterModal item={item} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryMasterService.updateInventoryMaster).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('name')
    expect(payload).not.toHaveProperty('description')
    expect(payload).not.toHaveProperty('sku')
    expect(payload).not.toHaveProperty('unit')
    expect(payload).not.toHaveProperty('type')
    expect(payload).not.toHaveProperty('status')
    expect(payload).not.toHaveProperty('minStock')
  })

  it('edit mode: editing name directly includes only name in the payload', async () => {
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const EditInventoryMasterModal = (await import('@/features/inventory/real/components/EditInventoryMasterModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const item = itemFixture({ name: 'Old Name' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryMasterModal item={item} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    const nameInput = screen.getByDisplayValue('Old Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'New Name')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryMasterService.updateInventoryMaster).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.name).toBe('New Name')
    expect(payload).not.toHaveProperty('description')
    expect(payload).not.toHaveProperty('minStock')
  })

  it('edit mode: editing description directly includes only description in the payload', async () => {
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const EditInventoryMasterModal = (await import('@/features/inventory/real/components/EditInventoryMasterModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const item = itemFixture({ description: 'Old description' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryMasterModal item={item} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    const descInput = screen.getByDisplayValue('Old description')
    await user.clear(descInput)
    await user.type(descInput, 'New description')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryMasterService.updateInventoryMaster).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.description).toBe('New description')
    expect(payload).not.toHaveProperty('name')
  })

  it('edit mode: editing sku directly includes only sku in the payload', async () => {
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const EditInventoryMasterModal = (await import('@/features/inventory/real/components/EditInventoryMasterModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const item = itemFixture({ sku: 'SKU-OLD' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryMasterModal item={item} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    const skuInput = screen.getByDisplayValue('SKU-OLD')
    await user.clear(skuInput)
    await user.type(skuInput, 'SKU-NEW')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryMasterService.updateInventoryMaster).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.sku).toBe('SKU-NEW')
    expect(payload).not.toHaveProperty('unit')
  })

  it('edit mode: editing unit directly includes only unit in the payload', async () => {
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const EditInventoryMasterModal = (await import('@/features/inventory/real/components/EditInventoryMasterModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const item = itemFixture({ unit: 'piece' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryMasterModal item={item} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    const unitInput = screen.getByDisplayValue('piece')
    await user.clear(unitInput)
    await user.type(unitInput, 'box')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryMasterService.updateInventoryMaster).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.unit).toBe('box')
    expect(payload).not.toHaveProperty('sku')
  })

  it('edit mode: changing type directly includes only type in the payload', async () => {
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const EditInventoryMasterModal = (await import('@/features/inventory/real/components/EditInventoryMasterModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const item = itemFixture({ type: 'consumable' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryMasterModal item={item} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    const comboboxes = screen.getAllByRole('combobox')
    await user.click(comboboxes[0])
    await user.click(await screen.findByRole('option', { name: /^device$/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryMasterService.updateInventoryMaster).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.type).toBe('device')
    expect(payload).not.toHaveProperty('status')
  })

  it('edit mode: changing status directly includes only status in the payload', async () => {
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const EditInventoryMasterModal = (await import('@/features/inventory/real/components/EditInventoryMasterModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const item = itemFixture({ status: 'active' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryMasterModal item={item} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    const comboboxes = screen.getAllByRole('combobox')
    await user.click(comboboxes[1])
    await user.click(await screen.findByRole('option', { name: /^inactive$/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryMasterService.updateInventoryMaster).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.status).toBe('inactive')
    expect(payload).not.toHaveProperty('type')
  })

  it('edit mode: editing minStock directly includes only minStock in the payload', async () => {
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const EditInventoryMasterModal = (await import('@/features/inventory/real/components/EditInventoryMasterModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const item = itemFixture({ minStock: 50 })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryMasterModal item={item} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    const minStockInput = screen.getByDisplayValue('50')
    await user.clear(minStockInput)
    await user.type(minStockInput, '75')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryMasterService.updateInventoryMaster).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.minStock).toBe(75)
    expect(payload).not.toHaveProperty('name')
  })
})
