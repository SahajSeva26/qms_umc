import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InventoryMasterEntity } from '@/features/inventory/real/inventoryMaster.types'
import InventoryDeviceSearchBar from './InventoryDeviceSearchBar'
import type { InventoryDeviceSearchBarValue } from './InventoryDeviceSearchBar'

const searchInventoryMasters = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: InventoryMasterEntity[]; count: number } }>>()

vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: { searchInventoryMasters: (query: unknown) => searchInventoryMasters(query) },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function Harness({ onChange }: { onChange: (v: InventoryDeviceSearchBarValue) => void }) {
  const [value, setValue] = useState<InventoryDeviceSearchBarValue>({ serial: '', item: null })
  return (
    <InventoryDeviceSearchBar
      value={value}
      onChange={(v) => { setValue(v); onChange(v) }}
    />
  )
}

async function renderBar(onChange = vi.fn()) {
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <Harness onChange={onChange} />
    </QueryClientProvider>,
  )
  return { user, onChange }
}

async function switchToNameMode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox', { name: 'Search by' }))
  const option = await screen.findByRole('option', { name: 'Item name' })
  await user.click(option)
}

describe('InventoryDeviceSearchBar', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    searchInventoryMasters.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
  })

  it('serial mode: reports the typed value directly (live filter), never queries the catalog', async () => {
    const { user, onChange } = await renderBar()
    await user.type(screen.getByPlaceholderText(/search by serial number/i), 'SN-001')

    expect(onChange).toHaveBeenLastCalledWith({ serial: 'SN-001', item: null })
    expect(searchInventoryMasters).not.toHaveBeenCalled()
  })

  it('item-name mode: searches the catalog scoped to type=device, and resolves a pick to an item filter', async () => {
    searchInventoryMasters.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'm1', code: 'ACGLU-001', name: 'Glucometer', description: '', type: 'device', sku: '', unit: '', minStock: 0, maxStock: 0, createdAt: '', updatedAt: '' }] },
    })
    const { user, onChange } = await renderBar()
    await switchToNameMode(user)
    await user.type(screen.getByPlaceholderText(/search catalog item by name/i), 'Glucometer')

    await vi.waitFor(() => expect(searchInventoryMasters).toHaveBeenCalledWith(expect.objectContaining({ type: 'device', name: 'Glucometer' })))

    const option = await screen.findByText('Glucometer (ACGLU-001)')
    await user.click(option)

    expect(onChange).toHaveBeenLastCalledWith({ serial: '', item: { id: 'm1', label: 'Glucometer (ACGLU-001)' } })
  })

  it('switching from item-name back to serial clears the item filter', async () => {
    searchInventoryMasters.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'm1', code: 'ACGLU-001', name: 'Glucometer', description: '', type: 'device', sku: '', unit: '', minStock: 0, maxStock: 0, createdAt: '', updatedAt: '' }] },
    })
    const { user, onChange } = await renderBar()
    await switchToNameMode(user)
    await user.type(screen.getByPlaceholderText(/search catalog item by name/i), 'Glucometer')
    const option = await screen.findByText('Glucometer (ACGLU-001)')
    await user.click(option)
    expect(onChange).toHaveBeenLastCalledWith({ serial: '', item: { id: 'm1', label: 'Glucometer (ACGLU-001)' } })

    await user.click(screen.getByRole('combobox', { name: 'Search by' }))
    await user.click(await screen.findByRole('option', { name: 'Serial number' }))

    expect(onChange).toHaveBeenLastCalledWith({ serial: '', item: null })
  })

  it('does not render an empty results box on focus alone, before anything is typed', async () => {
    const { user } = await renderBar()
    await switchToNameMode(user)
    await user.click(screen.getByPlaceholderText(/search catalog item by name/i))

    expect(screen.queryByText('Searching…')).not.toBeInTheDocument()
    expect(screen.queryByText(/no matching catalog items/i)).not.toBeInTheDocument()
    expect(searchInventoryMasters).not.toHaveBeenCalled()
  })
})
