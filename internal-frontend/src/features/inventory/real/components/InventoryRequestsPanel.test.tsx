import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'

vi.mock('@/hooks/usePermission')

vi.mock('@/features/inventory/real/inventoryRequest.service', () => ({
  inventoryRequestService: {
    searchInventoryRequests: vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } })),
    getInventoryRequestReport: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        summary: { totalRequests: 30, pendingRequests: 7 },
        requests: {
          byStatus: [
            { status: 'requested', count: 7 },
            { status: 'approved', count: 5 },
            { status: 'rejected', count: 2 },
            { status: 'received', count: 15 },
            { status: 'cancelled', count: 1 },
          ],
          byType: [
            { type: 'refill', count: 20 },
            { type: 'return', count: 10 },
          ],
        },
      },
    })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('InventoryRequestsPanel — permission gating', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('no permissions at all: list never mounts its search query, "New request" is not shown', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => false } as unknown as ReturnType<typeof usePermission>)

    const { inventoryRequestService } = await import('@/features/inventory/real/inventoryRequest.service')
    const InventoryRequestsPanel = (await import('@/features/inventory/real/components/InventoryRequestsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryRequestsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText(/don't have permission to view the request list/i)
    expect(inventoryRequestService.searchInventoryRequests).not.toHaveBeenCalled()
    expect(inventoryRequestService.getInventoryRequestReport).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /new request/i })).not.toBeInTheDocument()
  })

  it('manage permission: report strip renders real counts from the report response, not the paginated list', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({
      hasAnyPermission: (codes: string[]) => codes.includes('inventory-request:manage'),
    } as unknown as ReturnType<typeof usePermission>)

    const { inventoryRequestService } = await import('@/features/inventory/real/inventoryRequest.service')
    const InventoryRequestsPanel = (await import('@/features/inventory/real/components/InventoryRequestsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryRequestsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('Total Requests')
    expect(inventoryRequestService.getInventoryRequestReport).toHaveBeenCalled()
    // 30 (totalRequests) only appears in the report — the paginated list fixture is empty (count: 0)
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('create permission only (no search/manage): "New request" IS shown even though the list renders permission-denied and never queries', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({
      hasAnyPermission: (codes: string[]) => codes.includes('inventory-request:create'),
    } as unknown as ReturnType<typeof usePermission>)

    const { inventoryRequestService } = await import('@/features/inventory/real/inventoryRequest.service')
    const InventoryRequestsPanel = (await import('@/features/inventory/real/components/InventoryRequestsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryRequestsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText(/don't have permission to view the request list/i)
    expect(inventoryRequestService.searchInventoryRequests).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /new request/i })).toBeInTheDocument()
  })

  it('defaults the status filter to "requested" (the actionable inbox), not "All statuses"', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({
      hasAnyPermission: (codes: string[]) => codes.includes('inventory-request:search'),
    } as unknown as ReturnType<typeof usePermission>)

    const { inventoryRequestService } = await import('@/features/inventory/real/inventoryRequest.service')
    const InventoryRequestsPanel = (await import('@/features/inventory/real/components/InventoryRequestsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryRequestsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText(/no requests found/i)
    expect(inventoryRequestService.searchInventoryRequests).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'requested' }),
    )
    expect(screen.getByText('Requested')).toBeInTheDocument()
  })

  it('search permission only (no create): list mounts and queries, "New request" is not shown', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({
      hasAnyPermission: (codes: string[]) => codes.includes('inventory-request:search'),
    } as unknown as ReturnType<typeof usePermission>)

    const { inventoryRequestService } = await import('@/features/inventory/real/inventoryRequest.service')
    const InventoryRequestsPanel = (await import('@/features/inventory/real/components/InventoryRequestsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryRequestsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText(/no requests found/i)
    expect(inventoryRequestService.searchInventoryRequests).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /new request/i })).not.toBeInTheDocument()
  })

  it('History trigger visibility is driven by inventory-ledger:manage alone, independent of inventory-request:* permissions', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    // holds request:search + request:manage (so the row itself has stage actions) but NOT ledger:manage
    vi.mocked(usePermission).mockReturnValue({
      hasAnyPermission: (codes: string[]) => codes.includes('inventory-request:search') || codes.includes('inventory-request:manage'),
    } as unknown as ReturnType<typeof usePermission>)

    vi.doMock('@/features/inventory/real/inventoryRequest.service', () => ({
      inventoryRequestService: {
        searchInventoryRequests: vi.fn(async () => ({
          success: true,
          message: '',
          data: {
            count: 1,
            items: [{
              id: 'req-1', type: 'refill', status: 'requested',
              requestedBy: { id: 'r1', name: 'Vikram' }, processedBy: null,
              lineItems: [{ itemType: 'InventoryMaster', item: { id: 'm1' }, quantity: 1, fulfillment: [] }],
              createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
            }],
          },
        })),
        getInventoryRequestReport: vi.fn(async () => ({
          success: true,
          message: '',
          data: {
            summary: { totalRequests: 1, pendingRequests: 1 },
            requests: { byStatus: [], byType: [] },
          },
        })),
      },
    }))
    vi.resetModules()

    const InventoryRequestsPanel = (await import('@/features/inventory/real/components/InventoryRequestsPanel')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryRequestsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('Vikram')
    expect(screen.queryByRole('button', { name: /view movement history/i })).not.toBeInTheDocument()
  })

  it('History trigger IS shown with only request:search + ledger:manage — no request:update/manage needed', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    // can see the list (request:search) and view history (ledger:manage), but
    // cannot edit or move stages (no request:update/manage) — History must still render.
    vi.mocked(usePermission).mockReturnValue({
      hasAnyPermission: (codes: string[]) => codes.includes('inventory-request:search') || codes.includes('inventory-ledger:manage'),
    } as unknown as ReturnType<typeof usePermission>)

    vi.doMock('@/features/inventory/real/inventoryRequest.service', () => ({
      inventoryRequestService: {
        searchInventoryRequests: vi.fn(async () => ({
          success: true,
          message: '',
          data: {
            count: 1,
            items: [{
              id: 'req-1', type: 'refill', status: 'requested',
              requestedBy: { id: 'r1', name: 'Vikram' }, processedBy: null,
              lineItems: [{ itemType: 'InventoryMaster', item: { id: 'm1' }, quantity: 1, fulfillment: [] }],
              createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
            }],
          },
        })),
      },
    }))
    vi.resetModules()

    const InventoryRequestsPanel = (await import('@/features/inventory/real/components/InventoryRequestsPanel')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryRequestsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('Vikram')
    expect(screen.getByRole('button', { name: /view movement history/i })).toBeInTheDocument()
  })
})
