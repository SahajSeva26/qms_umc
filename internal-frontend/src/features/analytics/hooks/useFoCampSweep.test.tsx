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

function camp(id: string) {
  return { id, code: id, type: 'screening', date: '2026-01-01', status: 'closed', fo: null }
}

describe('useFoCampSweep', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not fire any request when disabled (caller lacks camp:manage/tenant:manage)', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { count: 0, items: [] } } })

    const { useFoCampSweep } = await import('./useFoCampSweep')
    const { result } = renderHook(() => useFoCampSweep('all', false), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(api.get).not.toHaveBeenCalled()
  })

  it('paginates until every camp is fetched, not just the first page', async () => {
    const PAGE_SIZE = 200
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string, config?: { params?: { page?: string } }) => {
      if (url === '/camps') {
        const page = config?.params?.page
        const items = page === '1'
          ? Array.from({ length: PAGE_SIZE }, (_, i) => camp(`p1-${i}`))
          : Array.from({ length: 10 }, (_, i) => camp(`p2-${i}`))
        return { data: { success: true, message: '', data: { count: PAGE_SIZE + 10, items } } }
      }
      throw new Error(`unexpected URL ${url}`)
    })

    const { useFoCampSweep } = await import('./useFoCampSweep')
    const { result } = renderHook(() => useFoCampSweep('all', true), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.length).toBe(PAGE_SIZE + 10)
    const calledPages = vi.mocked(api.get).mock.calls.map(([, config]) => (config as { params?: { page?: string } } | undefined)?.params?.page)
    expect(calledPages).toContain('1')
    expect(calledPages).toContain('2')
  })

  it('sends report=true on every page request', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { count: 1, items: [camp('a')] } } })

    const { useFoCampSweep } = await import('./useFoCampSweep')
    const { result } = renderHook(() => useFoCampSweep('all', true), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [, config] = vi.mocked(api.get).mock.calls[0]
    expect((config as { params?: { report?: string } } | undefined)?.params?.report).toBe('true')
  })

  it('omits dateFrom for "all" but sends a local-date dateFrom/dateTo for a numeric period', async () => {
    // Local components, not a UTC instant string — portable across whatever TZ the worker runs in,
    // unlike vi.stubEnv('TZ', ...) which doesn't reliably reconfigure JS's local timezone mid-run.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0)) // local 2026-03-15 10:00

    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { count: 0, items: [] } } })

    try {
      const { useFoCampSweep } = await import('./useFoCampSweep')

      const { result: allResult } = renderHook(() => useFoCampSweep('all', true), { wrapper })
      await vi.waitFor(() => expect(allResult.current.isSuccess).toBe(true))
      const allParams = (vi.mocked(api.get).mock.calls[0][1] as { params?: { dateFrom?: string; dateTo?: string } } | undefined)?.params
      expect(allParams?.dateFrom).toBeUndefined()
      expect(allParams?.dateTo).toBe('2026-03-15')

      vi.mocked(api.get).mockClear()
      const { result: periodResult } = renderHook(() => useFoCampSweep(30, true), { wrapper })
      await vi.waitFor(() => expect(periodResult.current.isSuccess).toBe(true))
      const periodParams = (vi.mocked(api.get).mock.calls[0][1] as { params?: { dateFrom?: string; dateTo?: string } } | undefined)?.params
      expect(periodParams?.dateFrom).toBe('2026-02-14')
      expect(periodParams?.dateTo).toBe('2026-03-15')
    } finally {
      vi.useRealTimers()
    }
  })
})
