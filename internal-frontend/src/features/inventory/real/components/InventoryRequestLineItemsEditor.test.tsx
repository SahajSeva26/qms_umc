import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRequestLineDraft, type RequestLineDraft } from '@/features/inventory/real/utils/requestLineDraft'
import InventoryRequestLineItemsEditor from '@/features/inventory/real/components/InventoryRequestLineItemsEditor'

vi.mock('@/hooks/useSession')

vi.mock('@/features/inventory/real/inventoryAssignment.service', () => ({
  inventoryAssignmentService: {
    searchInventoryAssignments: vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } })),
  },
}))

vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: {
    searchInventoryDevices: vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } })),
  },
}))

vi.mock('@/features/inventory/real/inventoryConsumable.service', () => ({
  inventoryConsumableService: {
    searchInventoryConsumables: vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } })),
  },
}))

vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: {
    searchInventoryMasters: vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

const emptyReturnLine: RequestLineDraft = {
  draftId: 'draft-1',
  stockKind: 'device',
  itemType: 'InventoryDevice',
  item: '',
  itemLabel: '',
  quantity: undefined,
}

describe('InventoryRequestLineItemsEditor — return-line item source', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('a return line queries only the acting session\'s own holdings (assignee: session.role.id), never the global stock registry', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: { role: { id: 'role-me-123', code: 'fo-1', name: 'My FO Role' } },
    } as unknown as ReturnType<typeof useSession>)

    const { inventoryAssignmentService } = await import('@/features/inventory/real/inventoryAssignment.service')
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    const { inventoryConsumableService } = await import('@/features/inventory/real/inventoryConsumable.service')

    const InventoryRequestLineItemsEditor = (await import('@/features/inventory/real/components/InventoryRequestLineItemsEditor')).default

    const queryClient = makeQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryRequestLineItemsEditor type="return" lines={[emptyReturnLine]} onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    await screen.findByText(/nothing currently held|select held item/i)

    expect(inventoryAssignmentService.searchInventoryAssignments).toHaveBeenCalledWith(
      expect.objectContaining({ assignee: 'role-me-123', inventoryType: 'InventoryDevice' }),
    )

    // This is the assertion that would have caught the original scoping bug:
    // a return line must NEVER hit the global device/consumable registries.
    expect(inventoryDeviceService.searchInventoryDevices).not.toHaveBeenCalled()
    expect(inventoryConsumableService.searchInventoryConsumables).not.toHaveBeenCalled()
  })

  it('a refill line queries the global InventoryMaster catalog, not the assignee holdings', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: { role: { id: 'role-me-123', code: 'fo-1', name: 'My FO Role' } },
    } as unknown as ReturnType<typeof useSession>)

    const { inventoryAssignmentService } = await import('@/features/inventory/real/inventoryAssignment.service')

    const InventoryRequestLineItemsEditor = (await import('@/features/inventory/real/components/InventoryRequestLineItemsEditor')).default

    const queryClient = makeQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryRequestLineItemsEditor
          type="refill"
          lines={[{ draftId: 'draft-2', stockKind: 'device', itemType: 'InventoryMaster', item: '', itemLabel: '', quantity: undefined }]}
          onChange={vi.fn()}
        />
      </QueryClientProvider>,
    )

    await screen.findByPlaceholderText(/search catalog item/i)

    // A refill line never touches the assignment/holdings query at all.
    expect(inventoryAssignmentService.searchInventoryAssignments).not.toHaveBeenCalled()
  })
})

// Regression coverage: array-index keys reattach a remaining line's DOM to the wrong data on removal.
describe('InventoryRequestLineItemsEditor — row identity survives removal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('removing the first of three lines preserves DOM node identity for the remaining rows (keyed by draftId, not position)', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: { role: { id: 'role-me-123', code: 'fo-1', name: 'My FO Role' } },
    } as unknown as ReturnType<typeof useSession>)

    function Harness() {
      const [lines, setLines] = useState<RequestLineDraft[]>([
        createRequestLineDraft({ draftId: 'A', stockKind: 'consumable', itemType: 'InventoryMaster', item: 'itemA', itemLabel: 'Item A' }),
        createRequestLineDraft({ draftId: 'B', stockKind: 'consumable', itemType: 'InventoryMaster', item: 'itemB', itemLabel: 'Item B' }),
        createRequestLineDraft({ draftId: 'C', stockKind: 'consumable', itemType: 'InventoryMaster', item: 'itemC', itemLabel: 'Item C' }),
      ])
      return <InventoryRequestLineItemsEditor type="refill" lines={lines} onChange={setLines} />
    }

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    )

    // Node identity, not just value — a controlled value is kept correct by React regardless of key strategy.
    const quantityInputs = () => screen.getAllByRole('spinbutton')
    expect(quantityInputs()).toHaveLength(3)
    const lineBNodeBefore = quantityInputs()[1]
    const lineCNodeBefore = quantityInputs()[2]

    const removeButtons = screen.getAllByRole('button', { name: 'Remove line' })
    await user.click(removeButtons[0])
    await screen.findByText('Item B')

    const remaining = quantityInputs()
    expect(remaining).toHaveLength(2)
    expect(remaining[0]).toBe(lineBNodeBefore)
    expect(remaining[1]).toBe(lineCNodeBefore)
  })
})
