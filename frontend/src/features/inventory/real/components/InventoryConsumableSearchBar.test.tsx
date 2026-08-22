import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InventoryMasterEntity } from '@/features/inventory/real/inventoryMaster.types'
import InventoryConsumableSearchBar from './InventoryConsumableSearchBar'
import type { InventoryConsumableSearchBarValue } from './InventoryConsumableSearchBar'

const searchInventoryMasters = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: InventoryMasterEntity[]; count: number } }>>()

vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: { searchInventoryMasters: (query: unknown) => searchInventoryMasters(query) },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function Harness({ onChange }: { onChange: (v: InventoryConsumableSearchBarValue) => void }) {
  const [value, setValue] = useState<InventoryConsumableSearchBarValue>({ batch: '', item: null })
  return (
    <InventoryConsumableSearchBar
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

describe('InventoryConsumableSearchBar', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    searchInventoryMasters.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
  })

  it('batch mode: does NOT report on every keystroke, only on Enter/Find', async () => {
    const { user, onChange } = await renderBar()
    await user.type(screen.getByPlaceholderText(/search by batch/i), 'BATCH-2026-014')

    expect(onChange).not.toHaveBeenCalled()

    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenLastCalledWith({ batch: 'BATCH-2026-014', item: null })
  })

  it('batch mode: Find button submits the same way as Enter', async () => {
    const { user, onChange } = await renderBar()
    await user.type(screen.getByPlaceholderText(/search by batch/i), 'BATCH-X')
    await user.click(screen.getByRole('button', { name: 'Find' }))

    expect(onChange).toHaveBeenLastCalledWith({ batch: 'BATCH-X', item: null })
  })

  it('item-name mode: searches the catalog scoped to type=consumable, and resolves a pick to an item filter', async () => {
    searchInventoryMasters.mockResolvedValue({
      success: true,
      message: '',
      data: { count: 1, items: [{ id: 'm1', code: 'LANC-003', name: 'Sterile Lancets', description: '', type: 'consumable', sku: '', unit: '', minStock: 0, maxStock: 0, createdAt: '', updatedAt: '' }] },
    })
    const { user, onChange } = await renderBar()
    await switchToNameMode(user)
    await user.type(screen.getByPlaceholderText(/search catalog item by name/i), 'Lancets')

    await vi.waitFor(() => expect(searchInventoryMasters).toHaveBeenCalledWith(expect.objectContaining({ type: 'consumable', name: 'Lancets' })))

    const option = await screen.findByText('Sterile Lancets (LANC-003)')
    await user.click(option)

    expect(onChange).toHaveBeenLastCalledWith({ batch: '', item: { id: 'm1', label: 'Sterile Lancets (LANC-003)' } })
  })

  it('switching from batch to item-name mode never queries the catalog until something is typed there', async () => {
    const { user } = await renderBar()
    await user.type(screen.getByPlaceholderText(/search by batch/i), 'BATCH-2026-014')
    await user.keyboard('{Enter}')

    await switchToNameMode(user)
    expect(searchInventoryMasters).not.toHaveBeenCalled()
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
