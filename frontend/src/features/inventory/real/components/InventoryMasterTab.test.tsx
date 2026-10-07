import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { InventoryMasterEntity } from '@/types/inventoryMaster.types'

vi.mock('@/hooks/usePermission')

vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: {
    searchInventoryMasters: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [
          {
            id: 'item-1',
            code: 'DEV-SYR-01',
            name: 'Syringe pump',
            description: '',
            type: 'device',
            sku: 'sku-001',
            unit: 'unit',
            minStock: 12,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            status: 'active',
          } satisfies InventoryMasterEntity,
        ],
      },
    })),
    getInventoryMasterReport: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        summary: { catalogItems: 55 },
        catalog: {
          byType: [
            { type: 'device', count: 30 },
            { type: 'consumable', count: 25 },
          ],
          byStatus: [
            { status: 'active', count: 50 },
            { status: 'inactive', count: 5 },
          ],
        },
      },
    })),
    // Unused by these tests (no form submit) — present only so
    // EditInventoryMasterModal's mutation hooks can mount without throwing.
    createInventoryMaster: vi.fn(),
    updateInventoryMaster: vi.fn(),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('InventoryMasterTab — report gating', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('non-manager: report strip is hidden and the report endpoint is never called', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => false } as unknown as ReturnType<typeof usePermission>)

    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const InventoryMasterTab = (await import('@/features/inventory/real/components/InventoryMasterTab')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryMasterTab />
      </QueryClientProvider>,
    )

    await screen.findByText('Syringe pump')
    expect(inventoryMasterService.getInventoryMasterReport).not.toHaveBeenCalled()
    expect(screen.queryByText('Catalog Items')).not.toBeInTheDocument()
  })

  it('manager: report strip renders real counts from the report response, not the paginated list', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)

    const { inventoryMasterService } = await import('@/features/inventory/real/inventoryMaster.service')
    const InventoryMasterTab = (await import('@/features/inventory/real/components/InventoryMasterTab')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryMasterTab />
      </QueryClientProvider>,
    )

    await screen.findByText('Catalog Items')
    expect(inventoryMasterService.getInventoryMasterReport).toHaveBeenCalled()
    // 55 (catalogItems) only exists in the report — the paginated list fixture has count: 1
    expect(screen.getByText('55')).toBeInTheDocument()
    // 30/25 (device/consumable) appear twice — once in the KPI strip, once in
    // the click-to-filter type strip below it, which shows the same report counts.
    expect(screen.getAllByText('30').length).toBeGreaterThan(0)
    expect(screen.getAllByText('25').length).toBeGreaterThan(0)
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})

// Row click opens a read-only detail drawer — Edit lives inside it, only for a manage-level viewer.
describe('InventoryMasterTab — row click opens a detail drawer, Edit lives inside it', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('a non-manager can still open the drawer by clicking a row, but sees no Edit button inside it', async () => {
    const user = userEvent.setup()
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => false } as unknown as ReturnType<typeof usePermission>)
    const InventoryMasterTab = (await import('@/features/inventory/real/components/InventoryMasterTab')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryMasterTab />
      </QueryClientProvider>,
    )

    await user.click(await screen.findByText('Syringe pump'))
    expect(await screen.findByRole('heading', { name: 'Syringe pump' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
  })

  it('a manager clicks a row to open the drawer, then Edit inside it to open the edit modal', async () => {
    const user = userEvent.setup()
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)
    const InventoryMasterTab = (await import('@/features/inventory/real/components/InventoryMasterTab')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryMasterTab />
      </QueryClientProvider>,
    )

    await user.click(await screen.findByText('Syringe pump'))
    const editButton = await screen.findByRole('button', { name: /^edit$/i })
    await user.click(editButton)

    expect(await screen.findByRole('heading', { name: /^edit item$/i })).toBeInTheDocument()
    // The drawer closes once Edit is clicked — only the modal remains.
    expect(screen.queryByRole('heading', { name: 'Syringe pump' })).not.toBeInTheDocument()
  })
})
