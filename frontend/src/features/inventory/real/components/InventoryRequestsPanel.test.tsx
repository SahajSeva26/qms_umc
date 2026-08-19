import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'

vi.mock('@/hooks/usePermission')

vi.mock('@/features/inventory/real/inventoryRequest.service', () => ({
  inventoryRequestService: {
    searchInventoryRequests: vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } })),
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

    await screen.findByText(/don't have permission to view/i)
    expect(inventoryRequestService.searchInventoryRequests).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /new request/i })).not.toBeInTheDocument()
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

    await screen.findByText(/don't have permission to view/i)
    expect(inventoryRequestService.searchInventoryRequests).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /new request/i })).toBeInTheDocument()
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
})
