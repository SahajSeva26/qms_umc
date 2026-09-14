import { addDays, differenceInCalendarDays, endOfMonth, format, startOfMonth } from 'date-fns'
import { useBookingAvailability } from '@/features/camps/hooks/useBookingAvailability'
import type { BookingAvailabilityPayload } from '@/types/campReal.types'

// The backend caps a single request to 30 days (MAX_AVAILABILITY_RANGE_DAYS),
// but a calendar month can be 31 days (Jan/Mar/May/Jul/Aug/Oct/Dec) — split
// only those months into two requests (days 1-30, then day 31 alone) and
// merge their `dates` maps, so every day stays bookable regardless of month length.
export const useMonthAvailability = (
  basePayload: Omit<BookingAvailabilityPayload, 'dateFrom' | 'dateTo'> | null,
  month: Date,
) => {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const daysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1
  const needsSplit = daysInMonth > 30

  const firstPayload = basePayload && {
    ...basePayload,
    dateFrom: format(monthStart, 'yyyy-MM-dd'),
    dateTo: format(needsSplit ? addDays(monthStart, 29) : monthEnd, 'yyyy-MM-dd'),
  }
  const secondPayload = needsSplit && basePayload
    ? { ...basePayload, dateFrom: format(monthEnd, 'yyyy-MM-dd'), dateTo: format(monthEnd, 'yyyy-MM-dd') }
    : null

  const first = useBookingAvailability(firstPayload)
  const second = useBookingAvailability(secondPayload)

  const dates = { ...(first.data?.data?.dates ?? {}), ...(second.data?.data?.dates ?? {}) }

  return {
    dates,
    isLoading: first.isLoading || second.isLoading,
    error: first.error ?? second.error,
    // refetch() bypasses `enabled`, so calling second.refetch() when
    // secondPayload is null would force the disabled query to run anyway —
    // only refetch the half that's actually active.
    refetch: () => (secondPayload ? Promise.all([first.refetch(), second.refetch()]) : first.refetch()),
  }
}
