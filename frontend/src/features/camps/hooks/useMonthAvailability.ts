import { addDays, endOfMonth, format, startOfMonth } from 'date-fns'
import { useQueries } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { BookingAvailabilityPayload, BookingAvailabilityDayEntry } from '@/types/campReal.types'

// The backend caps a single request to 30 days — a multi-month visible range can exceed that, so
// it's split into <=30-day chunks and fetched via useQueries (never a bare loop of useQuery calls).
const MAX_CHUNK_DAYS = 30

function chunkRange(from: Date, to: Date): { dateFrom: string; dateTo: string }[] {
  const chunks: { dateFrom: string; dateTo: string }[] = []
  let cursor = from
  while (cursor <= to) {
    const chunkEnd = addDays(cursor, MAX_CHUNK_DAYS - 1)
    const end = chunkEnd < to ? chunkEnd : to
    chunks.push({ dateFrom: format(cursor, 'yyyy-MM-dd'), dateTo: format(end, 'yyyy-MM-dd') })
    cursor = addDays(end, 1)
  }
  return chunks
}

const bookingAvailabilityKey = (payload: BookingAvailabilityPayload) => ['camps', 'booking-availability', payload] as const

export const useMonthAvailability = (
  basePayload: Omit<BookingAvailabilityPayload, 'dateFrom' | 'dateTo'> | null,
  visibleMonths: Date | Date[],
) => {
  const months = Array.isArray(visibleMonths) ? visibleMonths : [visibleMonths]
  // Cheap to recompute every render — deliberately no useMemo, since it's just derived from args.
  const rangeStart = months.length ? startOfMonth(months[0]) : null
  const rangeEnd = months.length ? endOfMonth(months[months.length - 1]) : null

  const chunks = basePayload && rangeStart && rangeEnd && rangeStart <= rangeEnd
    ? chunkRange(rangeStart, rangeEnd)
    : []

  const payloads: BookingAvailabilityPayload[] = basePayload
    ? chunks.map((chunk) => ({ ...basePayload, ...chunk }))
    : []

  const queries = useQueries({
    queries: payloads.map((payload) => ({
      queryKey: bookingAvailabilityKey(payload),
      queryFn: () => campsRealService.getBookingAvailability(payload),
      enabled: !!basePayload,
      staleTime: 30_000,
    })),
  })

  const dates: Record<string, BookingAvailabilityDayEntry> = {}
  for (const q of queries) {
    Object.assign(dates, q.data?.data?.dates ?? {})
  }

  return {
    dates,
    isLoading: queries.some((q) => q.isLoading),
    error: queries.find((q) => q.error)?.error ?? null,
    refetch: () => Promise.all(queries.map((q) => q.refetch())),
  }
}
