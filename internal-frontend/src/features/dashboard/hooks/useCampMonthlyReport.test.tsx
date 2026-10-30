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

function camp(id: string, status: string) {
  return { id, code: id, type: 'screening', date: new Date().toISOString(), status }
}

describe('useCampMonthlyReportData', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('paginates past a single page when count exceeds the page size, fetching every page', async () => {
    const api = (await import('@/lib/api/api')).default
    const PAGE_SIZE = 2000
    vi.mocked(api.get).mockImplementation(async (url: string, config?: { params?: { page?: string } }) => {
      if (url === '/camps') {
        const page = config?.params?.page
        if (page === '1') {
          return {
            data: {
              success: true, message: '',
              data: { count: PAGE_SIZE + 10, items: Array.from({ length: PAGE_SIZE }, (_, i) => camp(`p1-${i}`, 'closed')) },
            },
          }
        }
        return {
          data: {
            success: true, message: '',
            data: { count: PAGE_SIZE + 10, items: Array.from({ length: 10 }, (_, i) => camp(`p2-${i}`, 'closed')) },
          },
        }
      }
      throw new Error(`unexpected URL ${url}`)
    })

    const { useCampMonthlyReportData } = await import('./useCampMonthlyReport')
    const { result } = renderHook(() => useCampMonthlyReportData(true), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.length).toBe(PAGE_SIZE + 10)
    const calledPages = vi.mocked(api.get).mock.calls.map(([, config]) => (config as { params?: { page?: string } } | undefined)?.params?.page)
    expect(calledPages).toContain('1')
    expect(calledPages).toContain('2')
  })

  it('uses the local calendar date, not UTC, for dateFrom/dateTo around the IST midnight boundary', async () => {
    // 2026-01-01T02:00:00Z is still 2025-12-31 19:30 IST (UTC+5:30 would be 2026-01-01 07:30 —
    // use a timezone where this instant is unambiguously the PRIOR local day to catch the bug:
    // toISOString() on this instant yields '2026-01-01', but the local calendar date is '2025-12-31'.
    vi.stubEnv('TZ', 'Pacific/Midway') // UTC-11 — 2026-01-01T02:00:00Z is 2025-12-31T15:00 there
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-01T02:00:00.000Z'))

    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, message: '', data: { count: 0, items: [] } },
    })

    try {
      const { useCampMonthlyReportData } = await import('./useCampMonthlyReport')
      const { result } = renderHook(() => useCampMonthlyReportData(true), { wrapper })
      await vi.waitFor(() => expect(result.current.isSuccess).toBe(true))

      const [, config] = vi.mocked(api.get).mock.calls[0]
      const params = (config as { params?: { dateFrom?: string; dateTo?: string } } | undefined)?.params
      // Local date is 2025-12-31 — startOfYearISO must resolve to the local year's Jan 1
      // (2025-01-01), and todayISO must be 2025-12-31, NOT the UTC-derived 2026-01-01.
      expect(params?.dateTo).toBe('2025-12-31')
      expect(params?.dateFrom).toBe('2025-01-01')
    } finally {
      vi.useRealTimers()
      vi.unstubAllEnvs()
    }
  })

  it('filters out non-conducted camps (requested/confirmed/live/cancelled) — only closed/cancelled_charged survive', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true, message: '',
        data: {
          count: 5,
          items: [
            camp('a', 'closed'),
            camp('b', 'cancelled_charged'),
            camp('c', 'requested'),
            camp('d', 'confirmed'),
            camp('e', 'live'),
          ],
        },
      },
    })

    const { useCampMonthlyReportData } = await import('./useCampMonthlyReport')
    const { result } = renderHook(() => useCampMonthlyReportData(true), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const statuses = result.current.data?.map((c) => c.status)
    expect(statuses).toEqual(['closed', 'cancelled_charged'])
  })
})
