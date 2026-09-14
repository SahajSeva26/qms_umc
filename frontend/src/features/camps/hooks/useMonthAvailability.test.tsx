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
})
