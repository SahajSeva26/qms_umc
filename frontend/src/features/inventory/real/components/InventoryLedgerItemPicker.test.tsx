import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InventoryDeviceEntity } from '@/features/inventory/real/inventoryDevice.types'
import type { InventoryConsumableEntity } from '@/features/inventory/real/inventoryConsumable.types'

const searchInventoryDevices = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: InventoryDeviceEntity[]; count: number } }>>()
const searchInventoryConsumables = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: InventoryConsumableEntity[]; count: number } }>>()

vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: { searchInventoryDevices: (query: unknown) => searchInventoryDevices(query) },
}))
vi.mock('@/features/inventory/real/inventoryConsumable.service', () => ({
  inventoryConsumableService: { searchInventoryConsumables: (query: unknown) => searchInventoryConsumables(query) },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPicker(onChange = vi.fn()) {
  const InventoryLedgerItemPicker = (await import('@/features/inventory/real/components/InventoryLedgerItemPicker')).default
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <InventoryLedgerItemPicker value={null} onChange={onChange} />
    </QueryClientProvider>,
  )
  return { user, onChange }
}

// findByRole avoids a flaky stale-portal match under a full-suite run that plain getByText hit.
async function switchToConsumableMode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox', { name: 'Find item by' }))
  const option = await screen.findByRole('option', { name: 'Consumable' })
  await user.click(option)
}

describe('InventoryLedgerItemPicker', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    searchInventoryDevices.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    searchInventoryConsumables.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
  })

  it('does not render an empty results box on focus alone, before anything is typed', async () => {
    const { user } = await renderPicker()
    await user.click(screen.getByPlaceholderText(/search serial number/i))

    expect(screen.queryByTestId('ledger-item-picker-results')).not.toBeInTheDocument()
    expect(searchInventoryDevices).not.toHaveBeenCalled()

    await switchToConsumableMode(user)
    await user.click(screen.getByPlaceholderText(/enter exact batch number/i))
    expect(screen.queryByTestId('ledger-item-picker-results')).not.toBeInTheDocument()
  })

  it('device mode: searches live as you type (debounced), never queries the consumable endpoint', async () => {
    const { user } = await renderPicker()
    const input = screen.getByPlaceholderText(/search serial number/i)
    await user.type(input, 'SN-001')

    await vi.waitFor(() => {
      expect(searchInventoryDevices).toHaveBeenCalledWith(expect.objectContaining({ serialNumber: 'SN-001' }))
    })
    expect(searchInventoryConsumables).not.toHaveBeenCalled()
  })

  it('consumable mode: does NOT search on every keystroke, only on Enter/Find — never queries the device endpoint', async () => {
    const { user } = await renderPicker()
    await switchToConsumableMode(user)

    const input = screen.getByPlaceholderText(/enter exact batch number/i)
    await user.type(input, 'BATCH-2026-014')

    // No search fired yet — typing alone must never submit an exact-match query.
    expect(searchInventoryConsumables).not.toHaveBeenCalled()

    await user.keyboard('{Enter}')
    await vi.waitFor(() => {
      expect(searchInventoryConsumables).toHaveBeenCalledWith(expect.objectContaining({ batch: 'BATCH-2026-014' }))
    })
    expect(searchInventoryDevices).not.toHaveBeenCalled()
  })

  it('switching mode does not query the previous mode\'s endpoint', async () => {
    const { user } = await renderPicker()
    const input = screen.getByPlaceholderText(/search serial number/i)
    await user.type(input, 'SN-001')
    await vi.waitFor(() => expect(searchInventoryDevices).toHaveBeenCalled())

    searchInventoryDevices.mockClear()
    await switchToConsumableMode(user)
    await user.type(screen.getByPlaceholderText(/enter exact batch number/i), 'X')
    await user.keyboard('{Enter}')

    await vi.waitFor(() => expect(searchInventoryConsumables).toHaveBeenCalled())
    expect(searchInventoryDevices).not.toHaveBeenCalled()
  })

  it('result label disambiguates same-text batch across different catalog items', async () => {
    searchInventoryConsumables.mockResolvedValue({
      success: true,
      message: '',
      data: {
        count: 2,
        items: [
          { id: 'lot-1', item: { id: 'm1', name: 'Sterile Lancets' }, batch: 'BATCH-A', manufacturingDate: '', expiryDate: '', quantity: 10, createdAt: '', updatedAt: '' },
          { id: 'lot-2', item: { id: 'm2', name: 'Alcohol Swabs' }, batch: 'BATCH-A', manufacturingDate: '', expiryDate: '', quantity: 5, createdAt: '', updatedAt: '' },
        ],
      },
    })
    const { user } = await renderPicker()
    await switchToConsumableMode(user)
    await user.type(screen.getByPlaceholderText(/enter exact batch number/i), 'BATCH-A')
    await user.keyboard('{Enter}')

    await screen.findByText('Sterile Lancets')
    expect(screen.getByText('Alcohol Swabs')).toBeInTheDocument()
  })

  it('selecting a device calls onChange with inventoryType InventoryDevice', async () => {
    searchInventoryDevices.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'dev-1', serialNumber: 'SN-ACGLU-000142', item: { id: 'm1', name: 'Glucometer' }, status: 'available', createdAt: '', updatedAt: '' }] },
    })
    const { user, onChange } = await renderPicker()
    await user.type(screen.getByPlaceholderText(/search serial number/i), 'SN-ACGLU')
    const option = await screen.findByText('SN-ACGLU-000142')
    await user.click(option)

    expect(onChange).toHaveBeenCalledWith({ id: 'dev-1', inventoryType: 'InventoryDevice', label: 'SN-ACGLU-000142' })
  })

  it('selecting a consumable calls onChange with a batch + item-name label, disambiguating the chip', async () => {
    searchInventoryConsumables.mockResolvedValue({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [{ id: 'lot-1', item: { id: 'm1', name: 'Sterile Lancets' }, batch: 'BATCH-A', manufacturingDate: '', expiryDate: '', quantity: 10, createdAt: '', updatedAt: '' }],
      },
    })
    const { user, onChange } = await renderPicker()
    await switchToConsumableMode(user)
    await user.type(screen.getByPlaceholderText(/enter exact batch number/i), 'BATCH-A')
    await user.keyboard('{Enter}')
    const option = await screen.findByText('Sterile Lancets')
    await user.click(option.closest('button')!)

    expect(onChange).toHaveBeenCalledWith({ id: 'lot-1', inventoryType: 'InventoryConsumable', label: 'BATCH-A · Sterile Lancets' })
  })

  it('editing the batch input after a search clears the stale results so they are no longer selectable', async () => {
    searchInventoryConsumables.mockResolvedValue({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [{ id: 'lot-1', item: { id: 'm1', name: 'Sterile Lancets' }, batch: 'BATCH-A', manufacturingDate: '', expiryDate: '', quantity: 10, createdAt: '', updatedAt: '' }],
      },
    })
    const { user } = await renderPicker()
    await switchToConsumableMode(user)
    const input = screen.getByPlaceholderText(/enter exact batch number/i)
    await user.type(input, 'BATCH-A')
    await user.keyboard('{Enter}')
    await screen.findByText('Sterile Lancets')

    searchInventoryConsumables.mockClear()
    await user.type(input, 'X')

    // Stale BATCH-A result must disappear once the query no longer matches the last submitted batch.
    expect(screen.queryByText('Sterile Lancets')).not.toBeInTheDocument()
    expect(searchInventoryConsumables).not.toHaveBeenCalled()
  })
})
