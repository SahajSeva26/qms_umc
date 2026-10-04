import { addDays, format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { BookingAvailabilityPayload, BookingAvailabilityDayEntry } from '@/types/campReal.types'

// The prototype's day-strip shows a fixed 30-day rolling window from today — one request
// against [today, today+29], already within the backend's 30-day cap.
const RANGE_DAYS = 30

const dayRangeAvailabilityKey = (payload: BookingAvailabilityPayload) => ['camps', 'booking-availability', payload] as const

export const useDayRangeAvailability = (basePayload: Omit<BookingAvailabilityPayload, 'dateFrom' | 'dateTo'> | null) => {
  const today = new Date()
  const payload: BookingAvailabilityPayload | null = basePayload
    ? { ...basePayload, dateFrom: format(today, 'yyyy-MM-dd'), dateTo: format(addDays(today, RANGE_DAYS - 1), 'yyyy-MM-dd') }
    : null

  const query = useQuery({
    queryKey: payload ? dayRangeAvailabilityKey(payload) : ['camps', 'booking-availability', null],
    queryFn: () => campsRealService.getBookingAvailability(payload!),
    enabled: !!payload,
    staleTime: 30_000,
  })

  const dates: Record<string, BookingAvailabilityDayEntry> = query.data?.data?.dates ?? {}
  const eligibleFoCount = query.data?.data?.eligibleFoCount ?? 0

  return {
    dates,
    eligibleFoCount,
    // isFetching, not isLoading — a refetch of an already-successful query has isPending: false,
    // so isLoading alone would miss an in-flight refetch.
    isLoading: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}
