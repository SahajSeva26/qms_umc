import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { VendorMasterEntity } from '@/types/vendorMaster.types'

vi.mock('@/hooks/usePermission')

vi.mock('@/features/inventory/real/vendorMaster.service', () => ({
  vendorMasterService: {
    searchVendorMasters: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [
          {
            id: 'ven-1',
            code: 'VEN-ACME',
            name: 'Acme Medical Supplies',
            contacts: [{ name: 'Ramesh Kumar' }],
            address: { addressLine1: '1 MG Road', city: 'Mumbai', state: 'MH', country: 'India', pincode: '400001' },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            // Present on the fixture regardless — the test verifies the frontend hides it when the permission is absent.
            status: 'active',
          } satisfies VendorMasterEntity,
        ],
      },
    })),
    // Unused by these tests (no form submit) — present only so
    // EditVendorMasterModal's mutation hooks can mount without throwing.
    createVendorMaster: vi.fn(),
    updateVendorMaster: vi.fn(),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('InventoryVendorsPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('non-manager: no status column, no status filter, no New vendor button', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => false } as unknown as ReturnType<typeof usePermission>)

    const InventoryVendorsPanel = (await import('@/features/inventory/real/components/InventoryVendorsPanel')).default
    const queryClient = makeQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryVendorsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('Acme Medical Supplies')

    expect(screen.queryByText('Status')).not.toBeInTheDocument()
    expect(screen.queryByText('ACTIVE')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /new vendor/i })).not.toBeInTheDocument()

    const { vendorMasterService } = await import('@/features/inventory/real/vendorMaster.service')
    const [query] = vi.mocked(vendorMasterService.searchVendorMasters).mock.calls[0]
    expect(query).not.toHaveProperty('status')
  })

  it('manager: default query is status=active (not omitted), and switching to Inactive re-queries with status=inactive', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)

    const { vendorMasterService } = await import('@/features/inventory/real/vendorMaster.service')
    const InventoryVendorsPanel = (await import('@/features/inventory/real/components/InventoryVendorsPanel')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryVendorsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('Acme Medical Supplies')
    // No "Status" column header — vendors render as cards, not a table; the
    // status pill itself is still real and manage-gated.
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new vendor/i })).toBeInTheDocument()

    // Must be an explicit 'active', never omitted — the regression this test guards against.
    const [firstQuery] = vi.mocked(vendorMasterService.searchVendorMasters).mock.calls[0]
    expect(firstQuery).toMatchObject({ status: 'active' })
    expect(screen.getByText('Active', { exact: true })).toBeInTheDocument()
    expect(screen.queryByText('All statuses')).not.toBeInTheDocument()

    // Switch the status filter to Inactive — no "All statuses" option should exist at all.
    await user.click(screen.getByText('Active', { exact: true }))
    const listbox = await screen.findByRole('listbox')
    expect(listbox.textContent).not.toMatch(/all statuses/i)
    await user.click(screen.getByRole('option', { name: 'Inactive' }))

    await waitFor(() => {
      const lastCall = vi.mocked(vendorMasterService.searchVendorMasters).mock.calls.at(-1)
      expect(lastCall?.[0]).toMatchObject({ status: 'inactive' })
    })
  })
})

// Card click opens a read-only detail drawer — Edit lives inside it, only for vendor-master:update/manage.
describe('InventoryVendorsPanel — card click opens a detail drawer, Edit lives inside it', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('a viewer with no update permission can still open the drawer by clicking a card, but sees no Edit button inside it', async () => {
    const user = userEvent.setup()
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => false } as unknown as ReturnType<typeof usePermission>)
    const InventoryVendorsPanel = (await import('@/features/inventory/real/components/InventoryVendorsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryVendorsPanel />
      </QueryClientProvider>,
    )

    await user.click(await screen.findByText('Acme Medical Supplies'))
    expect(await screen.findByRole('heading', { name: 'Acme Medical Supplies' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
  })

  it('a viewer with vendor-master:manage clicks a card to open the drawer, then Edit inside it to open the edit modal', async () => {
    const user = userEvent.setup()
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)
    const InventoryVendorsPanel = (await import('@/features/inventory/real/components/InventoryVendorsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryVendorsPanel />
      </QueryClientProvider>,
    )

    await user.click(await screen.findByText('Acme Medical Supplies'))
    const editButton = await screen.findByRole('button', { name: /^edit$/i })
    await user.click(editButton)

    expect(await screen.findByRole('heading', { name: /^edit vendor$/i })).toBeInTheDocument()
  })
})
