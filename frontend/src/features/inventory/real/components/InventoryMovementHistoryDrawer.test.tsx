import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { InventoryLedgerEntity } from '@/features/inventory/real/inventoryLedger.types'
import type { InventoryMovementHistorySource } from '@/features/inventory/real/inventoryLedger.types'

const searchInventoryLedgers = vi.fn()

vi.mock('@/features/inventory/real/inventoryLedger.service', () => ({
  inventoryLedgerService: {
    searchInventoryLedgers: (...args: unknown[]) => searchInventoryLedgers(...args),
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

const requestSource: InventoryMovementHistorySource = {
  mode: 'request',
  requestId: 'req-1',
  requestType: 'refill',
  requestStatus: 'approved',
}

const deviceSource: InventoryMovementHistorySource = {
  mode: 'inventory',
  inventoryType: 'InventoryDevice',
  inventoryId: 'dev-1',
  summary: { serialNumber: 'SN-ACGLU-000142', itemName: 'Glucometer', status: 'assigned' },
}

// A ledger-only viewer (inventory-ledger:manage without inventory-consumable:manage) gets
// a summary built from a consumable entity whose `status` the backend omitted entirely.
const consumableSourceNoStatus: InventoryMovementHistorySource = {
  mode: 'inventory',
  inventoryType: 'InventoryConsumable',
  inventoryId: 'con-1',
  summary: { batch: 'BATCH-2026-014', itemName: 'Lancets', quantity: 450, status: undefined, expiryDate: '2027-01-15T00:00:00.000Z' },
}

async function renderDrawer(props: { open: boolean; source: InventoryMovementHistorySource; canManage: boolean }) {
  const InventoryMovementHistoryDrawer = (await import('@/features/inventory/real/components/InventoryMovementHistoryDrawer')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <InventoryMovementHistoryDrawer open={props.open} source={props.source} canManage={props.canManage} onClose={() => {}} />
    </QueryClientProvider>,
  )
}

describe('InventoryMovementHistoryDrawer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('closed drawer makes no request', async () => {
    mockRows([makeRow({})])
    await renderDrawer({ open: false, source: requestSource, canManage: true })
    expect(searchInventoryLedgers).not.toHaveBeenCalled()
  })

  it('open drawer without ledger permission makes no request and shows the restricted state', async () => {
    mockRows([makeRow({})])
    await renderDrawer({ open: true, source: requestSource, canManage: false })
    await screen.findByText(/you don't have permission to view the movement ledger/i)
    expect(searchInventoryLedgers).not.toHaveBeenCalled()
  })

  it('request-mode filter reaches the API as { request }', async () => {
    mockRows([makeRow({})])
    await renderDrawer({ open: true, source: requestSource, canManage: true })
    await vi.waitFor(() => {
      expect(searchInventoryLedgers).toHaveBeenCalledWith(expect.objectContaining({ request: 'req-1', page: '1' }))
    })
  })

  it('item-mode filter reaches the API as { inventory }', async () => {
    mockRows([makeRow({})])
    await renderDrawer({ open: true, source: deviceSource, canManage: true })
    await vi.waitFor(() => {
      expect(searchInventoryLedgers).toHaveBeenCalledWith(expect.objectContaining({ inventory: 'dev-1', page: '1' }))
    })
  })

  it('renders the event label, not a raw from->to row, and does not repeat type/status per row', async () => {
    mockRows([makeRow({ requestType: 'refill', from: 'warehouse', to: 'in-transit' })])
    await renderDrawer({ open: true, source: requestSource, canManage: true })
    expect(await screen.findByText('Refill reserved')).toBeInTheDocument()
    expect(screen.getByText(/Warehouse.*In transit/)).toBeInTheDocument()
  })

  it('count > page size exposes older history via pagination', async () => {
    mockRows([makeRow({})], 45)
    await renderDrawer({ open: true, source: requestSource, canManage: true })
    const nextButton = await screen.findByRole('button', { name: /next/i })
    nextButton.click()
    await vi.waitFor(() => {
      expect(searchInventoryLedgers).toHaveBeenCalledWith(expect.objectContaining({ page: '2' }))
    })
  })

  it('pagination resets to page 1 when the source identity changes while open', async () => {
    mockRows([makeRow({})], 45)
    const InventoryMovementHistoryDrawer = (await import('@/features/inventory/real/components/InventoryMovementHistoryDrawer')).default
    const { rerender } = render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryMovementHistoryDrawer open source={requestSource} canManage onClose={() => {}} />
      </QueryClientProvider>,
    )
    const nextButton = await screen.findByRole('button', { name: /next/i })
    nextButton.click()
    await vi.waitFor(() => {
      expect(searchInventoryLedgers).toHaveBeenCalledWith(expect.objectContaining({ page: '2' }))
    })

    searchInventoryLedgers.mockClear()
    const otherRequestSource: InventoryMovementHistorySource = { mode: 'request', requestId: 'req-2', requestType: 'return', requestStatus: 'requested' }
    rerender(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryMovementHistoryDrawer open source={otherRequestSource} canManage onClose={() => {}} />
      </QueryClientProvider>,
    )
    await vi.waitFor(() => {
      expect(searchInventoryLedgers).toHaveBeenCalledWith(expect.objectContaining({ request: 'req-2', page: '1' }))
    })
  })

  it('shows an inline error with retry, not the empty-state copy, when the query fails', async () => {
    searchInventoryLedgers.mockRejectedValue(new Error('network down'))
    await renderDrawer({ open: true, source: requestSource, canManage: true })
    await screen.findByText(/failed to load movement history/i)
    expect(screen.queryByText(/no stock movements have been recorded/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('request and item empty-state copy differ', async () => {
    mockRows([])
    await renderDrawer({ open: true, source: requestSource, canManage: true })
    expect(await screen.findByText('No stock movements have been recorded for this request.')).toBeInTheDocument()
  })

  it('item-mode empty state uses item-specific copy', async () => {
    mockRows([])
    await renderDrawer({ open: true, source: deviceSource, canManage: true })
    expect(await screen.findByText('No stock movements have been recorded for this item.')).toBeInTheDocument()
  })

  it('uses a neutral label for a return reversal — the same row shape occurs for both rejected and cancelled returns', async () => {
    mockRows([makeRow({ requestType: 'return', from: 'in-transit', to: 'field-officer' })])
    await renderDrawer({ open: true, source: requestSource, canManage: true })
    expect(await screen.findByText('Return reversed — stock returned to field officer')).toBeInTheDocument()
    expect(screen.queryByText(/declined/i)).not.toBeInTheDocument()
  })

  it('shows "Status unavailable" for a consumable summary when the backend omitted status, never defaults to Active', async () => {
    mockRows([makeRow({})])
    await renderDrawer({ open: true, source: consumableSourceNoStatus, canManage: true })
    await screen.findByText('BATCH-2026-014 · Lancets')
    expect(screen.getByText(/Status unavailable/)).toBeInTheDocument()
    expect(screen.queryByText(/Warehouse quantity: 450 · Active/)).not.toBeInTheDocument()
  })
})
