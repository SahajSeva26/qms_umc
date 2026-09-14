import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { InventoryConsumableEntity } from '@/types/inventoryConsumable.types'

vi.mock('@/hooks/usePermission')

vi.mock('@/features/inventory/real/inventoryConsumable.service', () => ({
  inventoryConsumableService: {
    searchInventoryConsumables: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [
          {
            id: 'lot-1',
            item: { id: 'item-1', code: 'syr-01', name: 'Syringe 5ml' },
            vendor: { id: 'ven-1', code: 'VEN-ACME', name: 'Acme Medical Supplies' },
            batch: 'BATCH-2026-014',
            manufacturingDate: '2026-01-01T00:00:00.000Z',
            expiryDate: '2027-01-01T00:00:00.000Z',
            quantity: 100,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            // status present on the fixture — the mapper WOULD include it
            // for a manager caller; the test verifies the frontend hides it
            // regardless of what's in the payload when the permission is absent.
            status: 'active',
          } satisfies InventoryConsumableEntity,
        ],
      },
    })),
    getInventoryConsumableReport: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        summary: { consumableLots: 42, warehouseConsumableQuantity: 900 },
        consumables: {
          warehouseQuantity: 900,
          expiredByDate: 5,
          byStatus: [
            { status: 'active', count: 40 },
            { status: 'expired', count: 2 },
          ],
        },
      },
    })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('InventoryConsumablesPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('non-manager: no status column, no status filter, no New lot button', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => false } as unknown as ReturnType<typeof usePermission>)

    const InventoryConsumablesPanel = (await import('@/features/inventory/real/components/InventoryConsumablesPanel')).default
    const queryClient = makeQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryConsumablesPanel />
      </QueryClientProvider>,
    )

    // batch is 14 chars, truncated to 10 + an ellipsis by truncateIdentifier
    await screen.findByText('BATCH-2026…')

    expect(screen.queryByText(/status/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ACTIVE/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /new consumable lot/i })).not.toBeInTheDocument()
  })

  it('manager: status column and status filter are present', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)

    const InventoryConsumablesPanel = (await import('@/features/inventory/real/components/InventoryConsumablesPanel')).default
    const queryClient = makeQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryConsumablesPanel />
      </QueryClientProvider>,
    )

    // batch is 14 chars, truncated to 10 + an ellipsis by truncateIdentifier
    await screen.findByText('BATCH-2026…')

    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new consumable lot/i })).toBeInTheDocument()
  })

  it('non-manager: report strip is hidden and the report endpoint is never called', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => false } as unknown as ReturnType<typeof usePermission>)

    const { inventoryConsumableService } = await import('@/features/inventory/real/inventoryConsumable.service')
    const InventoryConsumablesPanel = (await import('@/features/inventory/real/components/InventoryConsumablesPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryConsumablesPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('BATCH-2026…')
    expect(inventoryConsumableService.getInventoryConsumableReport).not.toHaveBeenCalled()
    expect(screen.queryByText('Consumable Lots')).not.toBeInTheDocument()
  })

  it('manager: report strip renders real counts from the report response, not the paginated list', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)

    const { inventoryConsumableService } = await import('@/features/inventory/real/inventoryConsumable.service')
    const InventoryConsumablesPanel = (await import('@/features/inventory/real/components/InventoryConsumablesPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryConsumablesPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('Consumable Lots')
    expect(inventoryConsumableService.getInventoryConsumableReport).toHaveBeenCalled()
    // 42 (consumableLots) only appears in the report — the paginated list fixture has count: 1
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('900')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
