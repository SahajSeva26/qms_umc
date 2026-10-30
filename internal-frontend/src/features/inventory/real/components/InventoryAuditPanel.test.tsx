import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const searchInventoryLedgers = vi.fn()

vi.mock('@/features/inventory/real/inventoryLedger.service', () => ({
  inventoryLedgerService: {
    searchInventoryLedgers: (...args: unknown[]) => searchInventoryLedgers(...args),
  },
}))

const response = {
  success: true,
  message: '',
  data: {
    count: 1,
    items: [{
      id: 'ledger-1',
      source: 'request',
      request: { id: 'request-1', type: 'refill', status: 'received' },
      requestType: 'refill',
      inventoryType: 'InventoryConsumable',
      inventory: { id: 'lot-1', batch: 'BATCH-001' },
      quantity: 4,
      from: 'in-transit',
      to: 'field-officer',
      assignee: { id: 'fo-1', name: 'Asha FO', code: 'FO-001' },
      actor: { roleId: 'manager-1', name: 'Manager Rao', email: 'manager@example.com' },
      createdAt: '2026-10-30T08:30:00.000Z',
    }],
  },
}

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPanel() {
  const InventoryAuditPanel = (await import('./InventoryAuditPanel')).default
  return render(
    <QueryClientProvider client={makeClient()}>
      <InventoryAuditPanel />
    </QueryClientProvider>,
  )
}

describe('InventoryAuditPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    searchInventoryLedgers.mockResolvedValue(response)
  })

  it('renders real append-only ledger data as a compact audit event', async () => {
    await renderPanel()

    expect(await screen.findByText('Refill issued')).toBeInTheDocument()
    expect(screen.getByText('BATCH-001')).toBeInTheDocument()
    expect(screen.queryByText('request-1')).not.toBeInTheDocument()
    expect(screen.queryByText('lot-1')).not.toBeInTheDocument()
    expect(screen.getByText('Manager Rao')).toBeInTheDocument()
    expect(screen.getByText('manager@example.com')).toBeInTheDocument()
    expect(screen.getByText(/4 consumable units · In transit → Field officer · Asha FO/)).toBeInTheDocument()
    expect(searchInventoryLedgers).toHaveBeenCalledWith(expect.objectContaining({ page: '1', limit: '10' }))
  })

  it('maps the Direct filter to the backend source contract and resets to page one', async () => {
    const user = userEvent.setup()
    await renderPanel()
    await screen.findByText('Refill issued')

    await user.click(screen.getByRole('combobox', { name: 'Audit event type' }))
    await user.click(await screen.findByRole('option', { name: 'Direct assignments' }))

    await vi.waitFor(() => {
      expect(searchInventoryLedgers).toHaveBeenCalledWith(expect.objectContaining({
        source: 'direct',
        requestType: undefined,
        page: '1',
      }))
    })
  })
})
