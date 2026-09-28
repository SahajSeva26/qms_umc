import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import type { InventoryDeviceEntity } from '@/types/inventoryDevice.types'
import InventoryDeviceMultiPicker from './InventoryDeviceMultiPicker'

vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: {
    searchInventoryDevices: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function deviceFixture(overrides: Partial<InventoryDeviceEntity> = {}): InventoryDeviceEntity {
  return {
    id: 'dev-1',
    serialNumber: 'SN-001',
    status: 'available',
    item: { id: 'm-1', name: 'Glucometer', code: 'ACGLU-001' },
    vendor: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function renderPicker(props: Partial<React.ComponentProps<typeof InventoryDeviceMultiPicker>> = {}) {
  const Wrapper = makeWrapper()
  return render(
    <Wrapper>
      <InventoryDeviceMultiPicker value={[]} labels={{}} onChange={vi.fn()} {...props} />
    </Wrapper>,
  )
}

describe('InventoryDeviceMultiPicker — available-device search for direct assignment', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('never fires a search before the picker is opened or any text is typed', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    renderPicker()

    await new Promise((resolve) => setTimeout(resolve, 400))

    expect(inventoryDeviceService.searchInventoryDevices).not.toHaveBeenCalled()
  })

  it('scopes every search to status=available', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    vi.mocked(inventoryDeviceService.searchInventoryDevices).mockResolvedValue({
      success: true, message: '', data: { items: [deviceFixture()], count: 1 },
    })
    const user = userEvent.setup()
    renderPicker()

    await user.type(screen.getByPlaceholderText(/search available devices by serial number/i), 'SN-001')

    await waitFor(() =>
      expect(inventoryDeviceService.searchInventoryDevices).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'available', serialNumber: 'SN-001' }),
      ),
    )
  })

  it('renders a matched device as "serialNumber — item name" and selecting it adds a chip', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    vi.mocked(inventoryDeviceService.searchInventoryDevices).mockResolvedValue({
      success: true, message: '', data: { items: [deviceFixture()], count: 1 },
    })
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderPicker({ onChange })

    await user.type(screen.getByPlaceholderText(/search available devices by serial number/i), 'SN')
    const option = await screen.findByText('SN-001 — Glucometer')
    await user.click(option)

    expect(onChange).toHaveBeenCalledWith(['dev-1'], { 'dev-1': 'SN-001 — Glucometer' })
  })

  it('falls back to the catalog code when the device has no item name', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    vi.mocked(inventoryDeviceService.searchInventoryDevices).mockResolvedValue({
      success: true, message: '', data: { items: [deviceFixture({ item: { id: 'm-1', code: 'ACGLU-001' } })], count: 1 },
    })
    const user = userEvent.setup()
    renderPicker()

    await user.type(screen.getByPlaceholderText(/search available devices by serial number/i), 'SN')

    expect(await screen.findByText('SN-001 — ACGLU-001')).toBeInTheDocument()
  })

  it('an already-selected device is filtered out of subsequent search results', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    vi.mocked(inventoryDeviceService.searchInventoryDevices).mockResolvedValue({
      success: true,
      message: '',
      data: {
        items: [deviceFixture(), deviceFixture({ id: 'dev-2', serialNumber: 'SN-002' })],
        count: 2,
      },
    })
    const user = userEvent.setup()
    renderPicker({ value: ['dev-1'], labels: { 'dev-1': 'SN-001 — Glucometer' } })

    await user.type(screen.getByPlaceholderText(/search available devices by serial number/i), 'SN')

    await screen.findByText('SN-002 — Glucometer')
    // dev-1 shows only as a chip, never as a second selectable dropdown row.
    expect(screen.getAllByText(/SN-001/).length).toBe(1)
  })

  it('removing a chip calls onChange without that device id', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderPicker({ value: ['dev-1'], labels: { 'dev-1': 'SN-001 — Glucometer' }, onChange })

    await user.click(screen.getByRole('button', { name: /remove sn-001/i }))

    expect(onChange).toHaveBeenCalledWith([], { 'dev-1': 'SN-001 — Glucometer' })
  })

  it('surfaces a search failure with a working Retry, not a silent/empty result', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    vi.mocked(inventoryDeviceService.searchInventoryDevices)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ success: true, message: '', data: { items: [deviceFixture()], count: 1 } })
    const user = userEvent.setup()
    renderPicker()

    await user.type(screen.getByPlaceholderText(/search available devices by serial number/i), 'SN')

    const retryButton = await screen.findByRole('button', { name: /retry/i })
    expect(screen.getByText("Couldn't search devices. Try again.")).toBeInTheDocument()

    await user.click(retryButton)

    expect(await screen.findByText('SN-001 — Glucometer')).toBeInTheDocument()
  })

  it('respects the disabled prop', () => {
    renderPicker({ disabled: true })

    expect(screen.getByPlaceholderText(/search available devices by serial number/i)).toBeDisabled()
  })
})
