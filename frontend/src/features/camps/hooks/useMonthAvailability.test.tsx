import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useMonthAvailability } from '@/features/camps/hooks/useMonthAvailability'

vi.mock('@/features/camps/campsReal.service', () => ({
  campsRealService: {
    getBookingAvailability: vi.fn(async (payload: { dateFrom: string; dateTo: string }) => ({
      success: true,
      message: '',
      data: {
        eligibleFoCount: 1,
        dateFrom: payload.dateFrom,
        dateTo: payload.dateTo,
        dates: { [payload.dateFrom]: { available: true, slots: { '9am-1pm': true } } },
      },
    })),
  },
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

const BASE_PAYLOAD = { projectId: 'proj-1', lat: 28.4595, lng: 77.0266 }

describe('useMonthAvailability', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('a 30-day month (e.g. April) fires exactly one getBookingAvailability call', async () => {
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const april = new Date(2026, 3, 15) // April has 30 days
    const { result } = renderHook(() => useMonthAvailability(BASE_PAYLOAD, april), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(campsRealService.getBookingAvailability).toHaveBeenCalledTimes(1)
    expect(vi.mocked(campsRealService.getBookingAvailability).mock.calls[0][0]).toEqual({
      ...BASE_PAYLOAD,
      dateFrom: '2026-04-01',
      dateTo: '2026-04-30',
    })
  })

  it('a 31-day month (e.g. January) fires exactly two calls and merges both into one dates map', async () => {
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const january = new Date(2027, 0, 15)
    const { result } = renderHook(() => useMonthAvailability(BASE_PAYLOAD, january), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(campsRealService.getBookingAvailability).toHaveBeenCalledTimes(2)

    const calls = vi.mocked(campsRealService.getBookingAvailability).mock.calls
    expect(calls[0][0]).toEqual({ ...BASE_PAYLOAD, dateFrom: '2027-01-01', dateTo: '2027-01-30' })
    expect(calls[1][0]).toEqual({ ...BASE_PAYLOAD, dateFrom: '2027-01-31', dateTo: '2027-01-31' })

    // Both halves' fixture responses land in the merged map.
    expect(Object.keys(result.current.dates)).toEqual(
      expect.arrayContaining(['2027-01-01', '2027-01-31']),
    )
  })

  it('refetch() re-fires both queries for a 31-day month, only one for a shorter month', async () => {
    const { campsRealService } = await import('@/features/camps/campsReal.service')

    const march = new Date(2026, 2, 10) // 31 days
    const { result: marchResult } = renderHook(() => useMonthAvailability(BASE_PAYLOAD, march), { wrapper })
    await waitFor(() => expect(marchResult.current.isLoading).toBe(false))
    vi.mocked(campsRealService.getBookingAvailability).mockClear()

    await marchResult.current.refetch()
    expect(campsRealService.getBookingAvailability).toHaveBeenCalledTimes(2)

    vi.mocked(campsRealService.getBookingAvailability).mockClear()

    const june = new Date(2026, 5, 10) // 30 days
    const { result: juneResult } = renderHook(() => useMonthAvailability(BASE_PAYLOAD, june), { wrapper })
    await waitFor(() => expect(juneResult.current.isLoading).toBe(false))
    vi.mocked(campsRealService.getBookingAvailability).mockClear()

    await juneResult.current.refetch()
    expect(campsRealService.getBookingAvailability).toHaveBeenCalledTimes(1)
  })

  it('a null basePayload disables both queries entirely', () => {
    const { result } = renderHook(() => useMonthAvailability(null, new Date(2026, 0, 15)), { wrapper })
    expect(result.current.dates).toEqual({})
  })

  describe('two visible months (numberOfMonths=2 rollout)', () => {
    it('passing [month, month+1] fetches BOTH months — the second (previously unfetched) month gets real data, not silently defaulting to all-unavailable', async () => {
      const april = new Date(2026, 3, 15) // 30 days
      const may = new Date(2026, 4, 15) // 31 days
      const { result } = renderHook(() => useMonthAvailability(BASE_PAYLOAD, [april, may]), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // April (30d, 1 chunk) + May (31d, needs its own chunking) — the merged range spans both
      // months, so real availability entries must exist for dates in EACH of them, not just April.
      expect(result.current.dates['2026-04-01']).toBeDefined()
      expect(result.current.dates['2026-05-01']).toBeDefined()
      expect(result.current.dates['2026-04-01'].available).toBe(true)
      expect(result.current.dates['2026-05-01'].available).toBe(true)
    })

    it('navigating so the two visible months change (e.g. March+April -> April+May) re-fetches for the NEWLY visible pair — every chunk\'s own dateFrom resolves to real data, none left unfetched', async () => {
      const { campsRealService } = await import('@/features/camps/campsReal.service')
      const march = new Date(2026, 2, 10)
      const april = new Date(2026, 3, 10)
      const { result, rerender } = renderHook(
        ({ months }: { months: Date[] }) => useMonthAvailability(BASE_PAYLOAD, months),
        { wrapper, initialProps: { months: [march, april] } },
      )
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      // The mock keys its response by each request's own dateFrom — every requested chunk must
      // show a real entry in the merged map, proving no chunk's range silently went unfetched.
      const firstRangeCalls = vi.mocked(campsRealService.getBookingAvailability).mock.calls
      firstRangeCalls.forEach(([payload]) => expect(result.current.dates[payload.dateFrom]).toBeDefined())
      expect(firstRangeCalls.length).toBeGreaterThanOrEqual(2) // March(31d)+April spans >30 days

      vi.mocked(campsRealService.getBookingAvailability).mockClear()
      const may = new Date(2026, 4, 10)
      rerender({ months: [april, may] })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      const secondRangeCalls = vi.mocked(campsRealService.getBookingAvailability).mock.calls
      expect(secondRangeCalls.length).toBeGreaterThan(0)
      secondRangeCalls.forEach(([payload]) => expect(result.current.dates[payload.dateFrom]).toBeDefined())
    })

    it('a wide two-month range spanning >60 days chunks into 3 requests, not a hardcoded 2', async () => {
      const { campsRealService } = await import('@/features/camps/campsReal.service')
      const march = new Date(2026, 2, 10) // 31 days
      const april = new Date(2026, 3, 10) // 30 days — 31+30 = 61 days total span, genuinely >60
      const { result } = renderHook(() => useMonthAvailability(BASE_PAYLOAD, [march, april]), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      // 61 total days at a 30-day cap needs exactly 3 chunks (30+30+1) — asserting the exact count,
      // not just >=2, is what actually proves chunking isn't hardcoded to 2.
      const calls = vi.mocked(campsRealService.getBookingAvailability).mock.calls
      expect(calls.length).toBe(3)
      const totalDays = calls.reduce((sum, [payload]) => {
        const from = new Date(payload.dateFrom)
        const to = new Date(payload.dateTo)
        return sum + (Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1)
      }, 0)
      expect(totalDays).toBe(61)
      // No single chunk exceeds the backend's 30-day cap.
      calls.forEach(([payload]) => {
        const from = new Date(payload.dateFrom)
        const to = new Date(payload.dateTo)
        const span = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
        expect(span).toBeLessThanOrEqual(30)
      })
    })

    it('a bare single Date (backward-compatible call shape) still works exactly as before', async () => {
      const { campsRealService } = await import('@/features/camps/campsReal.service')
      vi.mocked(campsRealService.getBookingAvailability).mockClear()
      const april = new Date(2026, 3, 15)
      const { result } = renderHook(() => useMonthAvailability(BASE_PAYLOAD, april), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(campsRealService.getBookingAvailability).toHaveBeenCalledTimes(1)
      expect(result.current.dates['2026-04-01']).toBeDefined()
    })
  })
})
