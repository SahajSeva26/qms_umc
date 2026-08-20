import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { InventoryLedgerEntity } from '@/types/inventoryLedger.types'

vi.mock('@/hooks/usePermission')

const searchInventoryLedgers = vi.fn()

vi.mock('@/features/inventory/real/inventoryLedger.service', () => ({
  inventoryLedgerService: {
    searchInventoryLedgers: (...args: unknown[]) => searchInventoryLedgers(...args),
  },
}))

// InventoryLedgerItemPicker (rendered inside the panel) imports these directly.
vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: { searchInventoryDevices: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })) },
}))
vi.mock('@/features/inventory/real/inventoryConsumable.service', () => ({
  inventoryConsumableService: {
    searchInventoryConsumables: vi.fn(async () => ({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'lot-9', item: { id: 'm9', name: 'Sterile Lancets' }, batch: 'BATCH-2026-014', manufacturingDate: '', expiryDate: '', quantity: 10 }] },
    })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function makeRow(overrides: Partial<InventoryLedgerEntity>): InventoryLedgerEntity {
  return {
    id: 'ledg-1',
    request: { id: 'req-1', type: 'refill', status: 'approved' },
    requestType: 'refill',
    inventoryType: 'InventoryDevice',
    inventory: { id: 'dev-1', serialNumber: 'SN-001', status: 'in-transit' },
    quantity: 1,
    from: 'warehouse',
    to: 'in-transit',
    assignee: { id: 'role-1', name: 'Jane FO', code: 'fo-1' },
    actor: { roleId: 'role-mgr', name: 'Manager Bob', email: 'bob@qms.test' },
    createdAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  }
}

function mockRows(items: InventoryLedgerEntity[], count = items.length) {
  searchInventoryLedgers.mockResolvedValue({
    success: true,
    message: '',
    data: { count, items },
  })
}

async function renderPanel(canManage: boolean) {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => canManage } as unknown as ReturnType<typeof usePermission>)

  const InventoryLedgerPanel = (await import('@/features/inventory/real/components/InventoryLedgerPanel')).default

  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <InventoryLedgerPanel />
    </QueryClientProvider>,
  )
}

describe('InventoryLedgerPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('without inventory-ledger:manage: never calls the search service, shows a restricted state', async () => {
    await renderPanel(false)

    await screen.findByText(/you don't have permission to view the movement ledger/i)
    expect(searchInventoryLedgers).not.toHaveBeenCalled()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders no action controls, even with manage permission', async () => {
    mockRows([makeRow({})])
    await renderPanel(true)

    await screen.findByText('SN-001')

    expect(screen.queryByRole('button', { name: /new/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([
    { name: 'refill reserve (warehouse -> in-transit)', row: makeRow({ requestType: 'refill', from: 'warehouse', to: 'in-transit', request: { id: 'r1', type: 'refill', status: 'approved' } }), expectedStatus: 'Approved', expectedMovement: 'Warehouse → In transit' },
    { name: 'refill issue (in-transit -> field-officer)', row: makeRow({ requestType: 'refill', from: 'in-transit', to: 'field-officer', request: { id: 'r2', type: 'refill', status: 'received' } }), expectedStatus: 'Received', expectedMovement: 'In transit → Field officer' },
    { name: 'refill release/cancel (in-transit -> warehouse)', row: makeRow({ requestType: 'refill', from: 'in-transit', to: 'warehouse', request: { id: 'r3', type: 'refill', status: 'cancelled' } }), expectedStatus: 'Cancelled', expectedMovement: 'In transit → Warehouse' },
    { name: 'return withdraw (field-officer -> in-transit)', row: makeRow({ requestType: 'return', from: 'field-officer', to: 'in-transit', request: { id: 'r4', type: 'return', status: 'requested' } }), expectedStatus: 'Requested', expectedMovement: 'Field officer → In transit' },
    { name: 'return restock (in-transit -> warehouse)', row: makeRow({ requestType: 'return', from: 'in-transit', to: 'warehouse', request: { id: 'r5', type: 'return', status: 'approved' } }), expectedStatus: 'Approved', expectedMovement: 'In transit → Warehouse' },
    { name: 'return restore-to-FO (in-transit -> field-officer)', row: makeRow({ requestType: 'return', from: 'in-transit', to: 'field-officer', request: { id: 'r6', type: 'return', status: 'rejected' } }), expectedStatus: 'Rejected', expectedMovement: 'In transit → Field officer' },
  ])('renders the $name movement shape with type, current status, movement, and assignee', async ({ row, expectedStatus, expectedMovement }) => {
    mockRows([row])
    await renderPanel(true)

    const typeLabel = row.requestType === 'refill' ? 'Refill' : 'Return'
    await screen.findByText(typeLabel)
    expect(screen.getByText(expectedStatus)).toBeInTheDocument()
    expect(screen.getByText(expectedMovement)).toBeInTheDocument()
    expect(screen.getByText('Jane FO')).toBeInTheDocument()
    expect(screen.getByText('Manager Bob')).toBeInTheDocument()
  })

  it('renders safe fallbacks for a null assignee and a missing actor name', async () => {
    mockRows([
      makeRow({
        id: 'ledg-legacy',
        assignee: null,
        actor: { roleId: 'role-x', email: 'noname@qms.test' },
        inventory: null,
      }),
    ])
    await renderPanel(true)

    await screen.findByText('noname@qms.test')
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2) // assignee + item, at minimum
  })

  it('changing a filter resets pagination back to page 1, not just defaults to it', async () => {
    // count > PAGE_SIZE (10) so PaginationControls actually renders a Next button
    searchInventoryLedgers.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 15, items: [makeRow({})] },
    })
    await renderPanel(true)
    await screen.findByText('SN-001')

    // navigate to page 2 first, so page 1 below is a real assertion, not a no-op default
    const nextButton = await screen.findByRole('button', { name: /next/i })
    nextButton.click()
    await vi.waitFor(() => {
      expect(searchInventoryLedgers).toHaveBeenCalledWith(expect.objectContaining({ page: '2' }))
    })

    searchInventoryLedgers.mockClear()

    const typeTrigger = screen.getByText('All types').closest('button')!
    typeTrigger.click()
    const refillOption = await screen.findByText('Refill', { selector: '[role="option"] *, [role="option"]' })
    refillOption.click()

    await vi.waitFor(() => {
      expect(searchInventoryLedgers).toHaveBeenCalledWith(
        expect.objectContaining({ requestType: 'refill', page: '1' }),
      )
    })
  })

  it('selecting a specific batch adds `inventory` while preserving the existing Type/From/To filters and resetting to page 1', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    mockRows([makeRow({})], 45)
    await renderPanel(true)
    await screen.findByText('SN-001')
    const user = userEvent.setup()

    // Set a Type filter and go to page 2 first, so this test proves preservation/reset, not defaults.
    const typeTrigger = screen.getByText('All types').closest('button')!
    await user.click(typeTrigger)
    await user.click(await screen.findByText('Return', { selector: '[role="option"] *, [role="option"]' }))
    await vi.waitFor(() => expect(searchInventoryLedgers).toHaveBeenCalledWith(expect.objectContaining({ requestType: 'return' })))

    const nextButton = await screen.findByRole('button', { name: /next/i })
    await user.click(nextButton)
    await vi.waitFor(() => expect(searchInventoryLedgers).toHaveBeenCalledWith(expect.objectContaining({ page: '2' })))

    searchInventoryLedgers.mockClear()

    // Pick a consumable batch via the item picker.
    await user.click(screen.getByRole('combobox', { name: 'Find item by' }))
    const consumableOption = await screen.findByRole('option', { name: 'Consumable' })
    await user.click(consumableOption)
    await user.type(screen.getByPlaceholderText(/enter exact batch number/i), 'BATCH-2026-014')
    await user.keyboard('{Enter}')
    const result = await screen.findByText('BATCH-2026-014')
    await user.click(result)

    await vi.waitFor(() => {
      expect(searchInventoryLedgers).toHaveBeenCalledWith(
        expect.objectContaining({ requestType: 'return', inventory: 'lot-9', page: '1' }),
      )
    })
  })

  it('a selected consumable overrides a conflicting broad Device item-type filter', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    mockRows([makeRow({})])
    await renderPanel(true)
    await screen.findByText('SN-001')
    const user = userEvent.setup()

    // Start from the broad "Device" item-type filter — the conflicting starting state.
    const itemTypeTrigger = screen.getByText('All items').closest('button')!
    await user.click(itemTypeTrigger)
    await user.click(await screen.findByRole('option', { name: 'Device' }))
    await vi.waitFor(() => expect(searchInventoryLedgers).toHaveBeenCalledWith(expect.objectContaining({ inventoryType: 'InventoryDevice' })))

    searchInventoryLedgers.mockClear()

    await user.click(screen.getByRole('combobox', { name: 'Find item by' }))
    const consumableOption = await screen.findByRole('option', { name: 'Consumable' })
    await user.click(consumableOption)
    await user.type(screen.getByPlaceholderText(/enter exact batch number/i), 'BATCH-2026-014')
    await user.keyboard('{Enter}')
    const result = await screen.findByText('Sterile Lancets')
    await user.click(result.closest('button')!)

    await vi.waitFor(() => {
      expect(searchInventoryLedgers).toHaveBeenCalledWith(
        expect.objectContaining({ inventoryType: 'InventoryConsumable', inventory: 'lot-9', page: '1' }),
      )
    })
  })
})
