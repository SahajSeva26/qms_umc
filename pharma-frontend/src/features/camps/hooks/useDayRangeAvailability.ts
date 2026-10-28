import { addDays, format } from 'date-fns'
import { useInfiniteQuery, type InfiniteData, type QueryKey } from '@tanstack/react-query'
import { pharmaCampsService } from '@/features/pharma/pharmaCamps.service'
import type { BookingAvailabilityPayload, BookingAvailabilityResponse, BookingAvailabilityDayEntry } from '@/types/campReal.types'

// Each batch is one request — stays well under the backend's 30-day span cap
// (camp.service.ts's MAX_AVAILABILITY_RANGE_DAYS) no matter how many batches load.
const BATCH_DAYS = 10

// windowStartKey (not the leadDays number alone) so a plain day-boundary rollover also
// invalidates the cache — "today" shifting forward changes this even if leadDays doesn't.
const dayRangeAvailabilityKey = (basePayload: object, windowStartKey: string) =>
  ['camps', 'booking-availability', 'infinite', basePayload, windowStartKey] as const

// leadDays shifts batch 0's start to match the day-strip's lead-time-shifted window; each
// fetchNextPage call fetches the next BATCH_DAYS slice. Mirrors internal-frontend's hook.
export const useDayRangeAvailability = (basePayload: Omit<BookingAvailabilityPayload, 'dateFrom' | 'dateTo'> | null, leadDays = 0) => {
  const windowStart = addDays(new Date(), Math.max(0, leadDays))
  const windowStartKey = format(windowStart, 'yyyy-MM-dd')

  const {
    data,
    isFetching,
    isFetchingNextPage,
    error,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<BookingAvailabilityResponse, Error, InfiniteData<BookingAvailabilityResponse>, QueryKey, number>({
    // windowStartKey in the key — a changed project lead time or a plain midnight rollover must
    // invalidate the cache, not silently reuse batches fetched against an earlier window start.
    queryKey: basePayload
      ? dayRangeAvailabilityKey(basePayload, windowStartKey)
      : ['camps', 'booking-availability', 'infinite', null, windowStartKey],
    queryFn: ({ pageParam }) => {
      const batchStart = addDays(windowStart, pageParam * BATCH_DAYS)
      const payload: BookingAvailabilityPayload = {
        ...basePayload!,
        dateFrom: format(batchStart, 'yyyy-MM-dd'),
        dateTo: format(addDays(batchStart, BATCH_DAYS - 1), 'yyyy-MM-dd'),
      }
      return pharmaCampsService.getBookingAvailability(payload).then((res) => res.data ?? { eligibleFoCount: 0, dateFrom: payload.dateFrom, dateTo: payload.dateTo, dates: {} })
    },
    initialPageParam: 0,
    // Always another batch to offer — the strip can keep scrolling indefinitely.
    getNextPageParam: (_last, allPages) => allPages.length,
    enabled: !!basePayload,
    staleTime: 30_000,
  })

  const dates: Record<string, BookingAvailabilityDayEntry> = {}
  for (const page of data?.pages ?? []) {
    Object.assign(dates, page.dates)
  }
  // Same project/location on every batch — the eligible-worker count doesn't vary by date range.
  const eligibleFoCount = data?.pages.at(-1)?.eligibleFoCount ?? 0

  return {
    dates,
    eligibleFoCount,
    // isFetching, not isLoading — a refetch of an already-successful query has isPending: false,
    // so isLoading alone would miss an in-flight refetch.
    isLoading: isFetching && !isFetchingNextPage,
    isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    fetchNextPage,
    // error reflects only an initial-load failure — a failed fetchNextPage is reported
    // separately via isFetchNextPageError, so callers don't conflate the two.
    error: isFetchNextPageError ? null : error,
    isFetchNextPageError,
    refetch,
  }
}
