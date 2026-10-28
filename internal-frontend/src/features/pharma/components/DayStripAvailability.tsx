import { useEffect, useRef } from 'react'
import { format } from 'date-fns'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import type { BookingAvailabilityDayEntry } from '@/types/campReal.types'
import { addDays } from '@/utils/calendarDate'
import AvailabilitySlotPill from '@/features/pharma/components/AvailabilitySlotPill'

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
const dayKeyOf = (date: Date) => format(date, 'yyyy-MM-dd')

interface DayStripAvailabilityProps {
  availability: Record<string, BookingAvailabilityDayEntry>
  campTimeSlots: CampTimeSlotValue[]
  /** Project.daysToBookBefore — days from today before the earliest bookable date. 0 allows same-day. */
  daysToBookBefore: number
  selectedDate: string
  selectedSlot: CampTimeSlotValue | ''
  onDateSelect: (date: string) => void
  onSlotSelect: (slot: CampTimeSlotValue) => void
  isLoading: boolean
  error: unknown
  onRetry: () => void
  /** True while there's always another batch to offer — the strip can keep loading indefinitely. */
  hasNextPage: boolean
  isFetchingNextPage: boolean
  /** True when the MOST RECENT fetchNextPage call failed — distinct from `error` (the initial
   * load), so Retry can call the right one instead of re-fetching already-loaded pages. */
  isFetchNextPageError: boolean
  onLoadMore: () => void
  /** Project-level count only — the backend doesn't expose a per-day/per-slot count. */
  eligibleFoCount: number
  /** Which field-staff kind this count/availability describes — 'FO' (screening/lab) or 'dietitian' (diet). Defaults to 'FO'. */
  workerLabel?: string
  city?: string
}

// Matches useDayRangeAvailability's own BATCH_DAYS — one batch's worth of tiles render as soon
// as it loads, instead of waiting for a fixed 30-day window to resolve all at once.
const INITIAL_BATCHES = 1
const BATCH_DAYS = 10

// Real green/red availability only — no fabricated per-day/per-slot worker counts.
const DayStripAvailability = ({
  availability, campTimeSlots, daysToBookBefore, selectedDate, selectedSlot, onDateSelect, onSlotSelect,
  isLoading, error, onRetry, hasNextPage, isFetchingNextPage, isFetchNextPageError, onLoadMore, eligibleFoCount, workerLabel = 'FO', city,
}: DayStripAvailabilityProps) => {
  const today = startOfToday()
  // Client-side only — the backend never enforces daysToBookBefore. The strip starts at the
  // earliest bookable date, not today, so every visible tile is a real candidate.
  const safeLeadDays = Number.isFinite(daysToBookBefore) ? Math.max(0, daysToBookBefore) : 0
  const earliestBookable = addDays(today, safeLeadDays)
  // Each loaded batch fills exactly BATCH_DAYS consecutive date keys (the backend walks every
  // date in its requested range) — so the loaded count alone tells us how many tiles to render.
  const loadedDays = Math.max(INITIAL_BATCHES * BATCH_DAYS, Object.keys(availability).length)
  const days = Array.from({ length: loadedDays }, (_, i) => addDays(earliestBookable, i))

  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    // A failed batch leaves the sentinel visible with nothing scrolled — without this guard the
    // observer fires onLoadMore again the instant isFetchingNextPage clears, looping forever.
    // Retry is the only way to try again once a next-page fetch has failed.
    if (!el || !hasNextPage || isFetchNextPageError) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) onLoadMore()
      },
      { root: el.closest('.overflow-x-auto'), rootMargin: '0px 200px 0px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, onLoadMore])

  const selectedDay = selectedDate ? availability[selectedDate] : undefined

  return (
    <div>
      <div className="flex items-center gap-4 mb-2 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success-soft" /> {workerLabel} free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger-soft" /> all booked
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1.5">
        {days.map((day) => {
          const key = dayKeyOf(day)
          const entry = availability[key]
          // "not known" must never render as "closed" — a failed request would look fully-booked.
          const known = !isLoading && !error && entry !== undefined
          const available = entry?.available === true
          const picked = selectedDate === key
          return (
            <button
              key={key}
              type="button"
              disabled={!known || !available}
              onClick={() => onDateSelect(key)}
              className="shrink-0 w-16 rounded-lg border px-1.5 py-2 text-center transition-colors"
              style={{
                borderColor: picked ? 'var(--qms-brand)' : 'var(--qms-border)',
                background: picked ? 'color-mix(in srgb, var(--qms-brand) 10%, transparent)' : 'var(--qms-surface)',
                opacity: !known || available ? 1 : 0.55,
                cursor: known && available ? 'pointer' : 'not-allowed',
              }}
            >
              <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>
                {day.toLocaleDateString('en-IN', { month: 'short' })}
              </div>
              <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{day.getDate()}</div>
              <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>
                {day.toLocaleDateString('en-IN', { weekday: 'short' })}
              </div>
              <div
                className="mt-1 text-[9px] font-bold uppercase rounded-full px-1 py-0.5"
                style={{
                  background: !known
                    ? 'var(--qms-surface-strong, rgba(0,0,0,.06))'
                    : available ? 'var(--qms-success-soft, rgba(16,185,129,.15))' : 'var(--qms-danger-soft, rgba(244,63,94,.15))',
                  color: !known
                    ? 'var(--qms-text-muted)'
                    : available ? 'var(--qms-success, #059669)' : 'var(--qms-danger, #e11d48)',
                }}
              >
                {!known ? '···' : available ? 'free' : 'closed'}
              </div>
            </button>
          )
        })}
        {hasNextPage && !isFetchNextPageError && (
          <div ref={sentinelRef} className="shrink-0 w-4 flex items-center justify-center">
            {isFetchingNextPage && (
              <span className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>···</span>
            )}
          </div>
        )}
      </div>

      {safeLeadDays > 0 && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          This project requires booking at least {safeLeadDays} day{safeLeadDays === 1 ? '' : 's'} in advance — earliest bookable date is {earliestBookable.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.
        </p>
      )}

      {isLoading && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>Loading availability…</p>
      )}

      {Boolean(error) && (
        <p className="text-[12px] mt-1.5 flex items-center gap-2" style={{ color: 'var(--qms-danger)' }}>
          Couldn't load availability for this range.
          <button type="button" onClick={onRetry} className="underline font-semibold">Retry</button>
        </p>
      )}

      {isFetchNextPageError && (
        <p className="text-[12px] mt-1.5 flex items-center gap-2" style={{ color: 'var(--qms-danger)' }}>
          Couldn't load more dates.
          <button type="button" onClick={onLoadMore} className="underline font-semibold">Retry</button>
        </p>
      )}

      {selectedDate && selectedDay ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3">
          {campTimeSlots.map((slot) => (
            <AvailabilitySlotPill
              key={slot}
              label={CAMP_TIME_SLOT_LABEL[slot]}
              available={selectedDay.slots[slot] === true}
              selected={selectedSlot === slot}
              onClick={() => onSlotSelect(slot)}
            />
          ))}
        </div>
      ) : (
        <p className="text-[12px] mt-2 text-center rounded-lg px-3 py-2 bg-muted/50" style={{ color: 'var(--qms-text-muted)' }}>
          ↑ Pick a date — {eligibleFoCount} {workerLabel}{eligibleFoCount === 1 ? '' : 's'} can run this camp{city ? ` near ${city}` : ''}
        </p>
      )}

      <p className="text-[11px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>
        Availability is checked when you choose a location and may change before confirmation.
      </p>
    </div>
  )
}

export default DayStripAvailability
