import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InventoryConsumableEntity } from '@/types/inventoryConsumable.types'

vi.mock('@/features/inventory/real/inventoryConsumable.service', () => ({
  inventoryConsumableService: {
    createInventoryConsumable: vi.fn(async () => ({ success: true, message: '', data: { id: 'lot-new' } })),
    updateInventoryConsumable: vi.fn(async () => ({ success: true, message: '', data: { id: 'lot-1' } })),
  },
}))

vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: {
    searchInventoryMasters: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

vi.mock('@/features/inventory/real/vendorMaster.service', () => ({
  vendorMasterService: {
    searchVendorMasters: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function consumableFixture(overrides: Partial<InventoryConsumableEntity> = {}): InventoryConsumableEntity {
  return {
    id: 'lot-1',
    item: { id: 'item-1', code: 'syr-01', name: 'Syringe 5ml' },
    vendor: { id: 'ven-1', code: 'VEN-ACME', name: 'Acme Medical Supplies' },
    batch: 'BATCH-2026-014',
    manufacturingDate: '2026-01-01T00:00:00.000Z',
    expiryDate: '2027-01-01T00:00:00.000Z',
    quantity: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('EditInventoryConsumableModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('edit mode: shows item/vendor as read-only text, no picker for either', async () => {
    const EditInventoryConsumableModal = (await import('@/features/inventory/real/components/EditInventoryConsumableModal')).default

    const queryClient = makeQueryClient()
    const lot = consumableFixture()

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryConsumableModal lot={lot} onClose={vi.fn()} canManageStatus={false} />
      </QueryClientProvider>,
    )

    expect(screen.queryByPlaceholderText(/search catalog item/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/search vendor/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Syringe 5ml \(syr-01\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Acme Medical Supplies \(VEN-ACME\)/i)).toBeInTheDocument()
  })

  it('edit mode: a lot with no vendor reference (pre-migration record) renders without crashing', async () => {
    const EditInventoryConsumableModal = (await import('@/features/inventory/real/components/EditInventoryConsumableModal')).default

    const queryClient = makeQueryClient()
    const lot = consumableFixture({ vendor: null })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryConsumableModal lot={lot} onClose={vi.fn()} canManageStatus={false} />
      </QueryClientProvider>,
    )

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('create mode: blocks submit without a vendor, and includes vendor in the POST body once picked', async () => {
    const { inventoryConsumableService } = await import('@/features/inventory/real/inventoryConsumable.service')
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const { vendorMasterService } = await import('@/features/inventory/real/vendorMaster.service')
    vi.mocked(inventoryMasterService.searchInventoryMasters).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 'item-1', code: 'syr-01', name: 'Syringe 5ml', description: '', type: 'consumable', sku: 'sku-1', unit: 'piece', minStock: 0, createdAt: '', updatedAt: '' }], count: 1 },
    })
    vi.mocked(vendorMasterService.searchVendorMasters).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 'ven-1', code: 'VEN-ACME', name: 'Acme Medical Supplies', contacts: [], createdAt: '', updatedAt: '' }], count: 1 },
    })
    const EditInventoryConsumableModal = (await import('@/features/inventory/real/components/EditInventoryConsumableModal')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryConsumableModal lot={null} onClose={vi.fn()} canManageStatus={false} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByPlaceholderText(/search catalog item/i), 'Syr')
    await user.click(await screen.findByText(/Syringe 5ml \(syr-01\)/i))

    // Batch/date/quantity have no accessible name of their own — target by input type/order.
    const textboxes = screen.getAllByRole('textbox').filter((el) => !el.hasAttribute('placeholder'))
    await user.type(textboxes[0], 'BATCH-999')
    const dateInputs = document.querySelectorAll('input[type="date"]')
    await user.type(dateInputs[0] as HTMLInputElement, '2026-01-01')
    await user.type(dateInputs[1] as HTMLInputElement, '2027-01-01')

    await user.click(screen.getByRole('button', { name: /create lot/i }))
    await vi.waitFor(() => expect(inventoryConsumableService.createInventoryConsumable).not.toHaveBeenCalled())

    await user.type(screen.getByPlaceholderText(/search vendor/i), 'Acme')
    await user.click(await screen.findByText(/Acme Medical Supplies \(VEN-ACME\)/i))
    await user.click(screen.getByRole('button', { name: /create lot/i }))

    await vi.waitFor(() => expect(inventoryConsumableService.createInventoryConsumable).toHaveBeenCalled())
    const [payload] = vi.mocked(inventoryConsumableService.createInventoryConsumable).mock.calls[0]
    expect(payload).toMatchObject({ item: 'item-1', vendor: 'ven-1', batch: 'BATCH-999' })
  })

  it('edit mode: blanking an already-set expiry warns instead of silently reverting on save', async () => {
    const EditInventoryConsumableModal = (await import('@/features/inventory/real/components/EditInventoryConsumableModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const lot = consumableFixture({ expiryDate: '2027-01-01T00:00:00.000Z' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryConsumableModal lot={lot} onClose={vi.fn()} canManageStatus={false} />
      </QueryClientProvider>,
    )

    const dateInputs = document.querySelectorAll('input[type="date"]')
    expect(screen.queryByText(/can't be cleared once set/i)).not.toBeInTheDocument()

    await user.clear(dateInputs[1] as HTMLInputElement)

    expect(await screen.findByText(/can't be cleared once set/i)).toBeInTheDocument()
  })

  it('edit mode: blanking an already-set expiry blocks Save entirely — no silent no-op that looks like success', async () => {
    const { inventoryConsumableService } = await import('@/features/inventory/real/inventoryConsumable.service')
    const EditInventoryConsumableModal = (await import('@/features/inventory/real/components/EditInventoryConsumableModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const lot = consumableFixture({ expiryDate: '2027-01-01T00:00:00.000Z' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryConsumableModal lot={lot} onClose={vi.fn()} canManageStatus={false} />
      </QueryClientProvider>,
    )

    const dateInputs = document.querySelectorAll('input[type="date"]')
    await user.clear(dateInputs[1] as HTMLInputElement)
    await screen.findByText(/can't be cleared once set/i)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    expect(saveButton).toBeDisabled()

    await user.click(saveButton)
    expect(inventoryConsumableService.updateInventoryConsumable).not.toHaveBeenCalled()
  })

  it('edit mode: saving without touching batch/manufacturingDate/quantity omits them — never resends a stale snapshot to clobber a concurrent edit', async () => {
    const { inventoryConsumableService } = await import('@/features/inventory/real/inventoryConsumable.service')
    const EditInventoryConsumableModal = (await import('@/features/inventory/real/components/EditInventoryConsumableModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const lot = consumableFixture({ batch: 'STALE-BATCH', quantity: 100 })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryConsumableModal lot={lot} onClose={vi.fn()} canManageStatus={false} />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryConsumableService.updateInventoryConsumable).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('batch')
    expect(payload).not.toHaveProperty('manufacturingDate')
    expect(payload).not.toHaveProperty('quantity')
  })

  it('edit mode: editing batch directly includes only batch in the payload', async () => {
    const { inventoryConsumableService } = await import('@/features/inventory/real/inventoryConsumable.service')
    const EditInventoryConsumableModal = (await import('@/features/inventory/real/components/EditInventoryConsumableModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const lot = consumableFixture({ batch: 'OLD-BATCH', quantity: 100 })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryConsumableModal lot={lot} onClose={vi.fn()} canManageStatus={false} />
      </QueryClientProvider>,
    )

    const batchInput = screen.getByDisplayValue('OLD-BATCH')
    await user.clear(batchInput)
    await user.type(batchInput, 'NEW-BATCH')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryConsumableService.updateInventoryConsumable).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.batch).toBe('NEW-BATCH')
    expect(payload).not.toHaveProperty('quantity')
  })

  it('edit mode: a lot with no expiry set shows no warning when the (already-empty) field is left alone', async () => {
    const EditInventoryConsumableModal = (await import('@/features/inventory/real/components/EditInventoryConsumableModal')).default
    const queryClient = makeQueryClient()
    const lot = consumableFixture({ expiryDate: undefined })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryConsumableModal lot={lot} onClose={vi.fn()} canManageStatus={false} />
      </QueryClientProvider>,
    )

    expect(screen.queryByText(/can't be cleared once set/i)).not.toBeInTheDocument()
  })
})
