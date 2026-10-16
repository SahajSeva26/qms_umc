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

function wrapperWithAppDefaultRetry({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function lead(id: string) {
  return { id, code: id, tenant: { name: 'Client', code: 'c' }, estimatedValue: 1000, status: 'new' }
}

describe('useSalesLeadSweep', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not fire any request when disabled (caller lacks lead:manage)', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { count: 0, items: [] } } })

    const { useSalesLeadSweep } = await import('./useSalesLeadSweep')
    const { result } = renderHook(() => useSalesLeadSweep('2026-01-01', '2026-01-31', false), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(api.get).not.toHaveBeenCalled()
  })

  it('paginates until every lead is fetched, sending fyFrom/fyTo on every page', async () => {
    const PAGE_SIZE = 200
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string, config?: { params?: { page?: string; fyFrom?: string; fyTo?: string } }) => {
      if (url === '/leads') {
        expect(config?.params?.fyFrom).toBe('2026-01-01')
        expect(config?.params?.fyTo).toBe('2026-01-31')
        const page = config?.params?.page
        const items = page === '1'
          ? Array.from({ length: PAGE_SIZE }, (_, i) => lead(`p1-${i}`))
          : Array.from({ length: 10 }, (_, i) => lead(`p2-${i}`))
        return { data: { success: true, message: '', data: { count: PAGE_SIZE + 10, items } } }
      }
      throw new Error(`unexpected URL ${url}`)
    })

    const { useSalesLeadSweep } = await import('./useSalesLeadSweep')
    const { result } = renderHook(() => useSalesLeadSweep('2026-01-01', '2026-01-31', true), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.length).toBe(PAGE_SIZE + 10)
  })

  it('never automatically retries a failed request, even under the app-wide retry:1 default', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockRejectedValue(new Error('network error'))

    const { useSalesLeadSweep } = await import('./useSalesLeadSweep')
    const { result } = renderHook(() => useSalesLeadSweep('2026-01-01', '2026-01-31', true), { wrapper: wrapperWithAppDefaultRetry })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(api.get).toHaveBeenCalledTimes(1)
  })
})
