import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import type { InventoryAssignmentReportFieldOfficer } from '@/types/inventoryAssignment.types'
import type { InventoryDeviceEntity } from '@/types/inventoryDevice.types'
import type { InventoryMasterEntity } from '@/types/inventoryMaster.types'
import { toast } from '@/components/ui/sonner'
import DirectAssignmentModal from './DirectAssignmentModal'

vi.mock('@/components/ui/sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/features/inventory/real/inventoryAssignment.service', () => ({
  inventoryAssignmentService: {
    directAssign: vi.fn(),
  },
}))

vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: {
    searchInventoryMasters: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: {
    searchInventoryDevices: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function foFixture(overrides: Partial<InventoryAssignmentReportFieldOfficer> = {}): InventoryAssignmentReportFieldOfficer {
  return {
    role: 'role-1', name: 'Jane FO', code: 'fo-1',
    devicesHeld: 0, consumableUnitsHeld: 0, awaitingApproval: 0, awaitingReceipt: 0,
    ...overrides,
  }
}

function deviceFixture(overrides: Partial<InventoryDeviceEntity> = {}): InventoryDeviceEntity {
  return { id: 'dev-1', serialNumber: 'SN-001', status: 'available', item: { id: 'm-2', name: 'Glucometer', code: 'ACGLU-001' }, vendor: null, createdAt: '', updatedAt: '', ...overrides }
}

function masterFixture(overrides: Partial<InventoryMasterEntity> = {}): InventoryMasterEntity {
  return { id: 'm-1', code: 'GAUZE-01', name: 'Gauze', description: '', type: 'consumable', sku: '', unit: '', minStock: 0, createdAt: '', updatedAt: '', ...overrides }
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function renderModal(props: Partial<React.ComponentProps<typeof DirectAssignmentModal>> = {}) {
  const Wrapper = makeWrapper()
  return render(
    <Wrapper>
      <DirectAssignmentModal fieldOfficers={[foFixture()]} onClose={vi.fn()} {...props} />
    </Wrapper>,
  )
}

describe('DirectAssignmentModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('disables the FO select and shows a placeholder when the roster is empty', () => {
    renderModal({ fieldOfficers: [] })

    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(screen.getByText('No field officers available')).toBeInTheDocument()
  })

  it('submit stays disabled until an FO is picked AND at least one device or consumable line is valid', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    vi.mocked(inventoryDeviceService.searchInventoryDevices).mockResolvedValue({
      success: true, message: '', data: { items: [deviceFixture()], count: 1 },
    })
    const user = userEvent.setup()
    renderModal()

    const submitButton = screen.getByRole('button', { name: /^assign$/i })
    expect(submitButton).toBeDisabled()

    // Picking an FO alone (no devices/consumables) is not enough.
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /jane fo \(fo-1\)/i }))
    expect(submitButton).toBeDisabled()

    // Adding one available device satisfies the "at least one" requirement.
    await user.type(screen.getByPlaceholderText(/search available devices by serial number/i), 'SN')
    await user.click(await screen.findByText('SN-001 — Glucometer'))

    expect(submitButton).toBeEnabled()
  })

  it('an incomplete consumable line (no quantity) keeps submit disabled even with an FO and a device picked', async () => {
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    vi.mocked(inventoryDeviceService.searchInventoryDevices).mockResolvedValue({
      success: true, message: '', data: { items: [deviceFixture()], count: 1 },
    })
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /jane fo \(fo-1\)/i }))
    await user.type(screen.getByPlaceholderText(/search available devices by serial number/i), 'SN')
    await user.click(await screen.findByText('SN-001 — Glucometer'))

    await user.click(screen.getByRole('button', { name: /add consumable/i }))

    expect(screen.getByRole('button', { name: /^assign$/i })).toBeDisabled()
  })

  it('flags a duplicate consumable item across two lines with an inline error', async () => {
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    vi.mocked(inventoryMasterService.searchInventoryMasters).mockResolvedValue({
      success: true, message: '', data: { items: [masterFixture()], count: 1 },
    })
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: /add consumable/i }))
    await user.click(screen.getByRole('button', { name: /add consumable/i }))

    // Line 1's selected-chip display shares the same text as the dropdown option — scope by role.
    await user.type(screen.getAllByPlaceholderText(/search catalog item/i)[0], 'Gauze')
    await user.click(await screen.findByRole('button', { name: 'Gauze (GAUZE-01)' }))

    await user.type(screen.getByPlaceholderText(/search catalog item/i), 'Gauze')
    await user.click(await screen.findByRole('button', { name: 'Gauze (GAUZE-01)' }))

    // Both lines are duplicates of each other, so the inline error renders on each.
    expect(screen.getAllByText('This item is already selected on another line.')).toHaveLength(2)
  })

  it('submits the exact payload shape, shows a success toast with the returned count, and closes', async () => {
    const { inventoryAssignmentService } = await import('@/features/inventory/real/inventoryAssignment.service')
    vi.mocked(inventoryAssignmentService.directAssign).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 6 },
    })
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    vi.mocked(inventoryDeviceService.searchInventoryDevices).mockResolvedValue({
      success: true, message: '', data: { items: [deviceFixture()], count: 1 },
    })
    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    vi.mocked(inventoryMasterService.searchInventoryMasters).mockResolvedValue({
      success: true, message: '', data: { items: [masterFixture()], count: 1 },
    })
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderModal({ onClose })

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /jane fo \(fo-1\)/i }))

    await user.type(screen.getByPlaceholderText(/search available devices by serial number/i), 'SN')
    await user.click(await screen.findByText('SN-001 — Glucometer'))

    await user.click(screen.getByRole('button', { name: /add consumable/i }))
    await user.type(screen.getByPlaceholderText(/search catalog item/i), 'Gauze')
    await user.click(await screen.findByText('Gauze (GAUZE-01)'))
    await user.type(screen.getByPlaceholderText(/quantity/i), '5')

    await user.click(screen.getByRole('button', { name: /^assign$/i }))

    await waitFor(() => expect(inventoryAssignmentService.directAssign).toHaveBeenCalledWith(
      'role-1',
      { devices: ['dev-1'], consumables: [{ item: 'm-1', quantity: 5 }] },
    ))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Assigned successfully — FO now holds 6 inventory records.'))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('a device-only submission omits consumables from the payload entirely (not an empty array)', async () => {
    const { inventoryAssignmentService } = await import('@/features/inventory/real/inventoryAssignment.service')
    vi.mocked(inventoryAssignmentService.directAssign).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 1 },
    })
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    vi.mocked(inventoryDeviceService.searchInventoryDevices).mockResolvedValue({
      success: true, message: '', data: { items: [deviceFixture()], count: 1 },
    })
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /jane fo \(fo-1\)/i }))
    await user.type(screen.getByPlaceholderText(/search available devices by serial number/i), 'SN')
    await user.click(await screen.findByText('SN-001 — Glucometer'))

    await user.click(screen.getByRole('button', { name: /^assign$/i }))

    await waitFor(() => expect(inventoryAssignmentService.directAssign).toHaveBeenCalledWith(
      'role-1',
      { devices: ['dev-1'], consumables: undefined },
    ))
  })

  it('a 409 from the mutation surfaces the real backend message and keeps the modal open', async () => {
    const { inventoryAssignmentService } = await import('@/features/inventory/real/inventoryAssignment.service')
    const err = new Error('request failed') as Error & { isAxiosError: boolean; response: unknown }
    err.isAxiosError = true
    err.response = { status: 409, data: { message: 'Device SN-001 is no longer available' }, statusText: '', headers: {}, config: {} }
    vi.mocked(inventoryAssignmentService.directAssign).mockRejectedValue(err)
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    vi.mocked(inventoryDeviceService.searchInventoryDevices).mockResolvedValue({
      success: true, message: '', data: { items: [deviceFixture()], count: 1 },
    })
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderModal({ onClose })

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /jane fo \(fo-1\)/i }))
    await user.type(screen.getByPlaceholderText(/search available devices by serial number/i), 'SN')
    await user.click(await screen.findByText('SN-001 — Glucometer'))

    await user.click(screen.getByRole('button', { name: /^assign$/i }))

    expect(await screen.findByText('Device SN-001 is no longer available')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('a rapid double-click on Assign fires exactly one mutation call, not two', async () => {
    const { inventoryAssignmentService } = await import('@/features/inventory/real/inventoryAssignment.service')
    let resolveAssign: (value: Awaited<ReturnType<typeof inventoryAssignmentService.directAssign>>) => void = () => {}
    vi.mocked(inventoryAssignmentService.directAssign).mockImplementation(
      () => new Promise((resolve) => { resolveAssign = resolve }),
    )
    const { inventoryDeviceService } = await import('@/features/inventory/real/inventoryDevice.service')
    vi.mocked(inventoryDeviceService.searchInventoryDevices).mockResolvedValue({
      success: true, message: '', data: { items: [deviceFixture()], count: 1 },
    })
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /jane fo \(fo-1\)/i }))
    await user.type(screen.getByPlaceholderText(/search available devices by serial number/i), 'SN')
    await user.click(await screen.findByText('SN-001 — Glucometer'))

    const submitButton = screen.getByRole('button', { name: /^assign$/i })
    // Two same-tick clicks (not awaited between) — isPending has no chance to re-render and
    // disable the button before the second fires, so only submittingRef can prevent a double-call.
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)

    await waitFor(() => expect(inventoryAssignmentService.directAssign).toHaveBeenCalled())
    expect(inventoryAssignmentService.directAssign).toHaveBeenCalledTimes(1)

    resolveAssign({ success: true, message: '', data: { items: [], count: 1 } })
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1))
  })

  it('Cancel calls onClose without submitting', async () => {
    const { inventoryAssignmentService } = await import('@/features/inventory/real/inventoryAssignment.service')
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderModal({ onClose })

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(inventoryAssignmentService.directAssign).not.toHaveBeenCalled()
  })
})
