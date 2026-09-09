import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InventoryDeviceEntity } from '@/types/inventoryDevice.types'

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

vi.mock('@/features/inventory/real/vendorMaster.service', () => ({
  vendorMasterService: {
    searchVendorMasters: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function deviceFixture(overrides: Partial<InventoryDeviceEntity> = {}): InventoryDeviceEntity {
  return {
    id: 'dev-1',
    item: { id: 'item-1', code: 'gluc-01', name: 'Glucometer' },
    vendor: { id: 'ven-1', code: 'VEN-ACME', name: 'Acme Medical Supplies' },
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

  it('edit mode: a device with no vendor reference (pre-migration record) renders without crashing', async () => {
    const EditInventoryDeviceModal = (await import('@/features/inventory/real/components/EditInventoryDeviceModal')).default

    const queryClient = makeQueryClient()
    const device = deviceFixture({ vendor: null })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryDeviceModal device={device} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(screen.getByText('—')).toBeInTheDocument()
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

  it('create mode: blocks submit without a vendor, and includes vendor in the POST body once picked', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const { vendorMasterService } = await import('@/features/inventory/real/vendorMaster.service')
    vi.mocked(inventoryMasterService.searchInventoryMasters).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 'item-1', code: 'gluc-01', name: 'Glucometer', description: '', type: 'device', sku: 'sku-1', unit: 'piece', minStock: 0, createdAt: '', updatedAt: '' }], count: 1 },
    })
    vi.mocked(vendorMasterService.searchVendorMasters).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 'ven-1', code: 'VEN-ACME', name: 'Acme Medical Supplies', contacts: [], createdAt: '', updatedAt: '' }], count: 1 },
    })
    const EditInventoryDeviceModal = (await import('@/features/inventory/real/components/EditInventoryDeviceModal')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryDeviceModal device={null} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    // Pick the catalog item only — submit must still be blocked with no vendor picked.
    await user.type(screen.getByPlaceholderText(/search catalog item/i), 'Gluc')
    await user.click(await screen.findByText(/Glucometer \(gluc-01\)/i))
    // Serial number has no accessible name/placeholder of its own — it's the
    // one plain textbox left once the two picker search inputs are excluded.
    const serialInput = screen.getAllByRole('textbox').find((el) => !el.hasAttribute('placeholder'))
    if (!serialInput) throw new Error('Serial number input not found')
    await user.type(serialInput, 'SN-999')
    await user.click(screen.getByRole('button', { name: /create device/i }))
    await vi.waitFor(() => expect(inventoryDeviceService.createInventoryDevice).not.toHaveBeenCalled())

    // Now pick a vendor too — submit must succeed and the payload must carry it.
    await user.type(screen.getByPlaceholderText(/search vendor/i), 'Acme')
    await user.click(await screen.findByText(/Acme Medical Supplies \(VEN-ACME\)/i))
    await user.click(screen.getByRole('button', { name: /create device/i }))

    await vi.waitFor(() => expect(inventoryDeviceService.createInventoryDevice).toHaveBeenCalled())
    const [payload] = vi.mocked(inventoryDeviceService.createInventoryDevice).mock.calls[0]
    expect(payload).toMatchObject({ item: 'item-1', vendor: 'ven-1', serialNumber: 'SN-999' })
  })

  it('edit mode: saving without touching any date field or status omits all 5 — never resends a stale snapshot to clobber a concurrent edit', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    const EditInventoryDeviceModal = (await import('@/features/inventory/real/components/EditInventoryDeviceModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const device = deviceFixture({
      manufacturingDate: '2026-01-01T00:00:00.000Z',
      warrantyExpiryDate: '2027-01-01T00:00:00.000Z',
      lastCalibrationDate: '2026-02-01T00:00:00.000Z',
      nextCalibrationDate: '2026-08-01T00:00:00.000Z',
    })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryDeviceModal device={device} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryDeviceService.updateInventoryDevice).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('manufacturingDate')
    expect(payload).not.toHaveProperty('warrantyExpiryDate')
    expect(payload).not.toHaveProperty('lastCalibrationDate')
    expect(payload).not.toHaveProperty('nextCalibrationDate')
    expect(payload).not.toHaveProperty('status')
  })

  it('edit mode: editing manufacturingDate directly includes only manufacturingDate in the payload', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    const EditInventoryDeviceModal = (await import('@/features/inventory/real/components/EditInventoryDeviceModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const device = deviceFixture({ manufacturingDate: '2026-01-01T00:00:00.000Z', warrantyExpiryDate: '2027-01-01T00:00:00.000Z' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryDeviceModal device={device} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    const dateInputs = document.querySelectorAll('input[type="date"]')
    await user.clear(dateInputs[0] as HTMLInputElement)
    await user.type(dateInputs[0] as HTMLInputElement, '2026-03-15')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryDeviceService.updateInventoryDevice).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.manufacturingDate).toBe('2026-03-15')
    expect(payload).not.toHaveProperty('warrantyExpiryDate')
    expect(payload).not.toHaveProperty('lastCalibrationDate')
    expect(payload).not.toHaveProperty('nextCalibrationDate')
    expect(payload).not.toHaveProperty('status')
  })

  it('edit mode: editing warrantyExpiryDate directly includes only warrantyExpiryDate in the payload', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    const EditInventoryDeviceModal = (await import('@/features/inventory/real/components/EditInventoryDeviceModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const device = deviceFixture({ warrantyExpiryDate: '2027-01-01T00:00:00.000Z' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryDeviceModal device={device} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    const dateInputs = document.querySelectorAll('input[type="date"]')
    await user.clear(dateInputs[1] as HTMLInputElement)
    await user.type(dateInputs[1] as HTMLInputElement, '2027-06-01')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryDeviceService.updateInventoryDevice).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.warrantyExpiryDate).toBe('2027-06-01')
    expect(payload).not.toHaveProperty('manufacturingDate')
    expect(payload).not.toHaveProperty('status')
  })

  it('edit mode: editing lastCalibrationDate directly includes only lastCalibrationDate in the payload', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    const EditInventoryDeviceModal = (await import('@/features/inventory/real/components/EditInventoryDeviceModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const device = deviceFixture({ lastCalibrationDate: '2026-02-01T00:00:00.000Z' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryDeviceModal device={device} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    const dateInputs = document.querySelectorAll('input[type="date"]')
    await user.clear(dateInputs[2] as HTMLInputElement)
    await user.type(dateInputs[2] as HTMLInputElement, '2026-04-10')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryDeviceService.updateInventoryDevice).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.lastCalibrationDate).toBe('2026-04-10')
    expect(payload).not.toHaveProperty('nextCalibrationDate')
    expect(payload).not.toHaveProperty('status')
  })

  it('edit mode: editing nextCalibrationDate directly includes only nextCalibrationDate in the payload', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    const EditInventoryDeviceModal = (await import('@/features/inventory/real/components/EditInventoryDeviceModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const device = deviceFixture({ nextCalibrationDate: '2026-08-01T00:00:00.000Z' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryDeviceModal device={device} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    const dateInputs = document.querySelectorAll('input[type="date"]')
    await user.clear(dateInputs[3] as HTMLInputElement)
    await user.type(dateInputs[3] as HTMLInputElement, '2026-09-20')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryDeviceService.updateInventoryDevice).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.nextCalibrationDate).toBe('2026-09-20')
    expect(payload).not.toHaveProperty('lastCalibrationDate')
    expect(payload).not.toHaveProperty('status')
  })

  it('edit mode: changing status directly includes only status in the payload', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    const EditInventoryDeviceModal = (await import('@/features/inventory/real/components/EditInventoryDeviceModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const device = deviceFixture({ status: 'available', manufacturingDate: '2026-01-01T00:00:00.000Z' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditInventoryDeviceModal device={device} onClose={vi.fn()} />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /assigned/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(inventoryDeviceService.updateInventoryDevice).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.status).toBe('assigned')
    expect(payload).not.toHaveProperty('manufacturingDate')
  })
})
