import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import { addDays, format } from 'date-fns'
import type { ReactNode } from 'react'
import { useDayRangeAvailability } from '@/features/camps/hooks/useDayRangeAvailability'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { BookingAvailabilityDayEntry } from '@/types/campReal.types'

vi.mock('@/features/camps/campsReal.service', () => ({
  campsRealService: {
    getBookingAvailability: vi.fn(),
  },
}))

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function dayEntry(available: boolean): BookingAvailabilityDayEntry {
  return { available, slots: { '9am-1pm': available, '10am-2pm': available } }
}

// One batch's worth of dates, keyed YYYY-MM-DD, starting at `from`.
function batchDates(from: Date, count: number, available = true): Record<string, BookingAvailabilityDayEntry> {
  const dates: Record<string, BookingAvailabilityDayEntry> = {}
  for (let i = 0; i < count; i++) dates[format(addDays(from, i), 'yyyy-MM-dd')] = dayEntry(available)
  return dates
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const BASE_PAYLOAD = { projectId: 'proj-1', lat: 18.5, lng: 73.8 }

describe('useDayRangeAvailability', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches only the first 10-day batch up front, not the old fixed 30-day request', async () => {
    const today = startOfToday()
    vi.mocked(campsRealService.getBookingAvailability).mockResolvedValue({
      success: true, message: '',
      data: { eligibleFoCount: 3, dateFrom: format(today, 'yyyy-MM-dd'), dateTo: format(addDays(today, 9), 'yyyy-MM-dd'), dates: batchDates(today, 10) },
    })

    const { result } = renderHook(() => useDayRangeAvailability(BASE_PAYLOAD), { wrapper: makeWrapper() })

    await waitFor(() => expect(Object.keys(result.current.dates).length).toBe(10))
    expect(campsRealService.getBookingAvailability).toHaveBeenCalledTimes(1)
    const call = vi.mocked(campsRealService.getBookingAvailability).mock.calls[0][0]
    expect(call.dateFrom).toBe(format(today, 'yyyy-MM-dd'))
    expect(call.dateTo).toBe(format(addDays(today, 9), 'yyyy-MM-dd'))
    expect(result.current.hasNextPage).toBe(true)
  })

  it('fetchNextPage requests the NEXT 10-day batch (not a repeat, not the old 30-day range) and merges it into dates', async () => {
    const today = startOfToday()
    vi.mocked(campsRealService.getBookingAvailability)
      .mockResolvedValueOnce({
        success: true, message: '',
        data: { eligibleFoCount: 3, dateFrom: format(today, 'yyyy-MM-dd'), dateTo: format(addDays(today, 9), 'yyyy-MM-dd'), dates: batchDates(today, 10, true) },
      })
      .mockResolvedValueOnce({
        success: true, message: '',
        data: { eligibleFoCount: 3, dateFrom: format(addDays(today, 10), 'yyyy-MM-dd'), dateTo: format(addDays(today, 19), 'yyyy-MM-dd'), dates: batchDates(addDays(today, 10), 10, false) },
      })

    const { result } = renderHook(() => useDayRangeAvailability(BASE_PAYLOAD), { wrapper: makeWrapper() })
    await waitFor(() => expect(Object.keys(result.current.dates).length).toBe(10))

    await act(async () => { await result.current.fetchNextPage() })

    await waitFor(() => expect(Object.keys(result.current.dates).length).toBe(20))
    expect(campsRealService.getBookingAvailability).toHaveBeenCalledTimes(2)
    const secondCall = vi.mocked(campsRealService.getBookingAvailability).mock.calls[1][0]
    expect(secondCall.dateFrom).toBe(format(addDays(today, 10), 'yyyy-MM-dd'))
    expect(secondCall.dateTo).toBe(format(addDays(today, 19), 'yyyy-MM-dd'))
    // Batch 1's own dates are present and distinguishable from batch 0's.
    expect(result.current.dates[format(addDays(today, 15), 'yyyy-MM-dd')].available).toBe(false)
    expect(result.current.dates[format(today, 'yyyy-MM-dd')].available).toBe(true)
  })

  it('every individual batch request stays at a 10-day span, never approaching the backend\'s 30-day cap, no matter how many batches have loaded', async () => {
    vi.mocked(campsRealService.getBookingAvailability).mockImplementation(async (payload) => ({
      success: true, message: '',
      data: { eligibleFoCount: 1, dateFrom: payload.dateFrom, dateTo: payload.dateTo, dates: {} },
    }))

    const { result } = renderHook(() => useDayRangeAvailability(BASE_PAYLOAD), { wrapper: makeWrapper() })
    await waitFor(() => expect(campsRealService.getBookingAvailability).toHaveBeenCalledTimes(1))

    await act(async () => { await result.current.fetchNextPage() })
    await act(async () => { await result.current.fetchNextPage() })
    await act(async () => { await result.current.fetchNextPage() })

    expect(campsRealService.getBookingAvailability).toHaveBeenCalledTimes(4)
    for (const call of vi.mocked(campsRealService.getBookingAvailability).mock.calls) {
      const payload = call[0]
      const spanDays = Math.round((new Date(payload.dateTo).getTime() - new Date(payload.dateFrom).getTime()) / 86400000) + 1
      expect(spanDays).toBe(10)
    }
  })

  it('a lead time shifts batch 0 forward — the first request starts at today+leadDays, not today', async () => {
    const today = startOfToday()
    vi.mocked(campsRealService.getBookingAvailability).mockResolvedValue({
      success: true, message: '',
      data: { eligibleFoCount: 2, dateFrom: '', dateTo: '', dates: {} },
    })

    renderHook(() => useDayRangeAvailability(BASE_PAYLOAD, 5), { wrapper: makeWrapper() })

    await waitFor(() => expect(campsRealService.getBookingAvailability).toHaveBeenCalled())
    const call = vi.mocked(campsRealService.getBookingAvailability).mock.calls[0][0]
    expect(call.dateFrom).toBe(format(addDays(today, 5), 'yyyy-MM-dd'))
    expect(call.dateTo).toBe(format(addDays(today, 14), 'yyyy-MM-dd'))
  })

  it('eligibleFoCount reflects the most recently loaded batch — stable across batches for the same project/location', async () => {
    const today = startOfToday()
    vi.mocked(campsRealService.getBookingAvailability).mockResolvedValue({
      success: true, message: '',
      data: { eligibleFoCount: 4, dateFrom: format(today, 'yyyy-MM-dd'), dateTo: format(addDays(today, 9), 'yyyy-MM-dd'), dates: {} },
    })

    const { result } = renderHook(() => useDayRangeAvailability(BASE_PAYLOAD), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.eligibleFoCount).toBe(4))
  })

  it('a null basePayload disables the query entirely — no request fires', () => {
    renderHook(() => useDayRangeAvailability(null), { wrapper: makeWrapper() })
    expect(campsRealService.getBookingAvailability).not.toHaveBeenCalled()
  })

  it('a changed leadDays (same project/location) re-fetches batch 0 at the new window instead of reusing the old window\'s cached dates', async () => {
    const today = startOfToday()
    vi.mocked(campsRealService.getBookingAvailability)
      .mockResolvedValueOnce({
        success: true, message: '',
        data: { eligibleFoCount: 3, dateFrom: format(today, 'yyyy-MM-dd'), dateTo: format(addDays(today, 9), 'yyyy-MM-dd'), dates: batchDates(today, 10, true) },
      })
      .mockResolvedValueOnce({
        success: true, message: '',
        data: { eligibleFoCount: 3, dateFrom: format(addDays(today, 5), 'yyyy-MM-dd'), dateTo: format(addDays(today, 14), 'yyyy-MM-dd'), dates: batchDates(addDays(today, 5), 10, false) },
      })

    const { result, rerender } = renderHook(
      ({ leadDays }: { leadDays: number }) => useDayRangeAvailability(BASE_PAYLOAD, leadDays),
      { wrapper: makeWrapper(), initialProps: { leadDays: 0 } },
    )
    await waitFor(() => expect(result.current.dates[format(today, 'yyyy-MM-dd')]?.available).toBe(true))

    // Same project/location, new lead time — e.g. the user picked a different project with a
    // different daysToBookBefore, or the same project's setting changed underneath them.
    rerender({ leadDays: 5 })

    await waitFor(() => expect(campsRealService.getBookingAvailability).toHaveBeenCalledTimes(2))
    const secondCall = vi.mocked(campsRealService.getBookingAvailability).mock.calls[1][0]
    expect(secondCall.dateFrom).toBe(format(addDays(today, 5), 'yyyy-MM-dd'))
    // The day shared by both windows (today+5) must reflect the NEW fetch's answer (false), not a
    // stale value carried over from the old window's cache under a reused key.
    await waitFor(() => expect(result.current.dates[format(addDays(today, 5), 'yyyy-MM-dd')].available).toBe(false))
  })
})
