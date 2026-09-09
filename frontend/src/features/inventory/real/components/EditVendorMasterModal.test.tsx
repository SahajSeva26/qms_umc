import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { VendorMasterEntity } from '@/types/vendorMaster.types'

vi.mock('@/features/inventory/real/vendorMaster.service', () => ({
  vendorMasterService: {
    createVendorMaster: vi.fn(async () => ({ success: true, message: '', data: { id: 'ven-new' } })),
    updateVendorMaster: vi.fn(async () => ({ success: true, message: '', data: { id: 'ven-1' } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function vendorFixture(overrides: Partial<VendorMasterEntity> = {}): VendorMasterEntity {
  return {
    id: 'ven-1',
    code: 'VEN-ACME',
    name: 'Acme Medical Supplies',
    contacts: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('EditVendorMasterModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('edit mode: saving without touching name omits it — never resends a stale snapshot to clobber a concurrent edit', async () => {
    const { vendorMasterService } = await import('@/features/inventory/real/vendorMaster.service')
    const EditVendorMasterModal = (await import('@/features/inventory/real/components/EditVendorMasterModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const vendor = vendorFixture()

    render(
      <QueryClientProvider client={queryClient}>
        <EditVendorMasterModal vendor={vendor} onClose={vi.fn()} canManageStatus={false} />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(vendorMasterService.updateVendorMaster).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('name')
  })

  it('edit mode: editing name directly includes name in the payload', async () => {
    const { vendorMasterService } = await import('@/features/inventory/real/vendorMaster.service')
    const EditVendorMasterModal = (await import('@/features/inventory/real/components/EditVendorMasterModal')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const vendor = vendorFixture({ name: 'Old Vendor Name' })

    render(
      <QueryClientProvider client={queryClient}>
        <EditVendorMasterModal vendor={vendor} onClose={vi.fn()} canManageStatus={false} />
      </QueryClientProvider>,
    )

    const nameInput = screen.getByDisplayValue('Old Vendor Name')
    await user.clear(nameInput)
    await user.type(nameInput, 'New Vendor Name')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await vi.waitFor(() => {
      const call = vi.mocked(vendorMasterService.updateVendorMaster).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.name).toBe('New Vendor Name')
  })
})
