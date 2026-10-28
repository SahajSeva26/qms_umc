import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/api/api', () => ({
  default: { get: vi.fn() },
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function project(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id, code: id, name: `Project ${id}`,
    tenant: { name: `Client ${id}` },
    division: { name: `Division ${id}` },
    therapy: 'cardiology',
    campCost: 100,
    totalCamps: 1,
    executionMode: { mode: 'po', po: { purchaseOrders: [] } },
    stats: { executedCamps: 3 },
    ...overrides,
  }
}

describe('useDashboardProjects', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('paginates until every project is fetched, not just the first page', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation((_url, config) => {
      const page = Number(config?.params?.page ?? '1')
      // 450 projects total, page size 200 -> 3 pages (200 + 200 + 50)
      const pageSize = page < 3 ? 200 : 50
      const items = Array.from({ length: pageSize }, (_, i) => project(`p${page}-${i}`, { campCost: 1, totalCamps: 1 }))
      return Promise.resolve({ data: { success: true, message: '', data: { count: 450, items } } })
    })

    const { useDashboardProjects } = await import('./useDashboardProjects')
    const { result } = renderHook(() => useDashboardProjects(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // every project is a pending PO (po-mode, no number, executed camps) -> count reflects all 450
    expect(result.current.data?.pendingPurchaseOrders.length).toBe(450)
    expect(api.get).toHaveBeenCalledTimes(3)
  })

  it('ranks top-6 by estimatedValue across the full sweep, not just the first page', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        message: '',
        data: {
          count: 8,
          items: [
            project('low', { campCost: 1000, totalCamps: 2 }), // 2,000
            project('high', { campCost: 5000, totalCamps: 10 }), // 50,000
            project('mid', { campCost: 2000, totalCamps: 5 }), // 10,000
            ...Array.from({ length: 5 }, (_, i) => project(`tiny${i}`, { campCost: 1, totalCamps: 1 })),
          ],
        },
      },
    })

    const { useDashboardProjects } = await import('./useDashboardProjects')
    const { result } = renderHook(() => useDashboardProjects(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const top = result.current.data!.topByEstimatedValue
    expect(top.length).toBe(6)
    expect(top[0].id).toBe('high')
    expect(top[0].estimatedValue).toBe(50000)
    expect(top[1].id).toBe('mid')
    expect(top[2].id).toBe('low')
  })

  it('pending POs excludes non-PO modes, projects with a PO number, and projects with no executed camps', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        message: '',
        data: {
          count: 4,
          items: [
            project('missing-po-executed'), // included
            project('agreement-mode', { executionMode: { mode: 'agreement' } }), // excluded
            project('has-po-number', { executionMode: { mode: 'po', po: { purchaseOrders: [{ number: 'PO-1' }] } } }), // excluded
            project('no-camps-yet', { stats: { executedCamps: 0 } }), // excluded
          ],
        },
      },
    })

    const { useDashboardProjects } = await import('./useDashboardProjects')
    const { result } = renderHook(() => useDashboardProjects(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const pending = result.current.data!.pendingPurchaseOrders
    expect(pending.length).toBe(1)
    expect(pending[0].id).toBe('missing-po-executed')
    expect(pending[0].clientName).toBe('Client missing-po-executed')
    expect(pending[0].divisionName).toBe('Division missing-po-executed')
  })

  it('falls back to an em-dash client name when tenant is an unpopulated id string', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true,
        message: '',
        data: { count: 1, items: [project('x', { tenant: 'raw-id-string', division: 'raw-div-id' })] },
      },
    })

    const { useDashboardProjects } = await import('./useDashboardProjects')
    const { result } = renderHook(() => useDashboardProjects(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.topByEstimatedValue[0].clientName).toBe('—')
    expect(result.current.data?.topByEstimatedValue[0].divisionName).toBeNull()
  })
})
