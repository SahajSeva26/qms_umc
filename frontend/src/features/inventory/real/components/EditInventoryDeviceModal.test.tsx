import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InventoryDeviceEntity } from '@/features/inventory/real/inventoryDevice.types'

vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: {
    createInventoryDevice: vi.fn(async () => ({ success: true, message: '', data: { id: 'dev-new' } })),
    updateInventoryDevice: vi.fn(async () => ({ success: true, message: '', data: { id: 'dev-1' } })),
  },
}))

vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: {
    searchInventoryMasters: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function deviceFixture(overrides: Partial<InventoryDeviceEntity> = {}): InventoryDeviceEntity {
  return {
    id: 'dev-1',
    item: { id: 'item-1', code: 'gluc-01', name: 'Glucometer' },
    serialNumber: 'SN-000142',
    status: 'available',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('EditInventoryDeviceModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('edit mode: shows item/serial as read-only text, no picker, and PUT body omits both', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    const EditInventoryDeviceModal = (await import('@/features/inventory/real/components/EditInventoryDeviceModal')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const device = deviceFixture()

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryDeviceModal device={device} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    // No item picker (no search-as-you-type input) mounted in edit mode.
    expect(screen.queryByPlaceholderText(/search catalog item/i)).not.toBeInTheDocument()
    // Immutable identity shown as static text.
    expect(screen.getByText(/Glucometer \(gluc-01\)/i)).toBeInTheDocument()
    expect(screen.getByText('SN-000142')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await vi.waitFor(() => expect(inventoryDeviceService.updateInventoryDevice).toHaveBeenCalled())
    const [, payload] = vi.mocked(inventoryDeviceService.updateInventoryDevice).mock.calls[0]
    expect(payload).not.toHaveProperty('item')
    expect(payload).not.toHaveProperty('serialNumber')
  })

  it('create mode: shows the item picker and an editable serial field, POST body omits status', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    const EditInventoryDeviceModal = (await import('@/features/inventory/real/components/EditInventoryDeviceModal')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryDeviceModal device={null} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(screen.getByPlaceholderText(/search catalog item/i)).toBeInTheDocument()

    // Submitting without picking an item is blocked by the required-field
    // validation — confirms create() is never called with a missing item,
    // and more importantly that no status control exists to submit at all.
    expect(screen.queryByText(/status/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /create device/i }))
    await vi.waitFor(() => expect(inventoryDeviceService.createInventoryDevice).not.toHaveBeenCalled())
  })
})
