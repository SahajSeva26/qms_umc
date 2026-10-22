import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePermission } from '@/hooks/usePermission'
import { getDashboardData } from '@/features/dashboard/dashboard.service'
import type { DashboardData } from '@/types/dashboard.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/dashboard/dashboard.service')

const DASHBOARD_PAYLOAD = {
  headline: [], company: {}, project: {}, fo: {}, sales: {}, accounts: {}, doctors: {}, patients: {}, hasLoadError: false,
} as unknown as DashboardData

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(usePermission).mockReturnValue({
      hasAnyPermission: () => false,
    } as unknown as ReturnType<typeof usePermission>)
    vi.mocked(getDashboardData).mockResolvedValue(DASHBOARD_PAYLOAD)
  })

  function wrapperWith(queryClient: QueryClient) {
    return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  it('does not refetch on remount within staleTime — there is no filter param to key the query on', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { useDashboardData } = await import('./useDashboardData')

    const first = renderHook(() => useDashboardData(), { wrapper: wrapperWith(queryClient) })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    expect(getDashboardData).toHaveBeenCalledTimes(1)

    // A second mount against the SAME query client (simulating navigating away and back, or a
    // sibling component mounting) must read the cached entry, not refetch — this is what
    // staleTime is for. Without it, every remount/window-focus would re-run all 5 baseline requests.
    const second = renderHook(() => useDashboardData(), { wrapper: wrapperWith(queryClient) })
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))
    expect(getDashboardData).toHaveBeenCalledTimes(1)
  })

  it('uses one stable query key for a given permission set — not one that varies per render, which would defeat caching', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { useDashboardData } = await import('./useDashboardData')

    const { result, rerender } = renderHook(() => useDashboardData(), { wrapper: wrapperWith(queryClient) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender()
    rerender()

    // Still exactly one fetch across 3 renders of the same permission set — proves the key isn't
    // regenerated per-render (e.g. from a fresh object/filter-state identity each time).
    expect(getDashboardData).toHaveBeenCalledTimes(1)
  })
})
