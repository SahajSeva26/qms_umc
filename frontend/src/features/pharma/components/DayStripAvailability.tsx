import { format } from 'date-fns'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import type { BookingAvailabilityDayEntry } from '@/types/campReal.types'
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
  selectedDate: string
  selectedSlot: CampTimeSlotValue | ''
  onDateSelect: (date: string) => void
  onSlotSelect: (slot: CampTimeSlotValue) => void
  isLoading: boolean
  error: unknown
  onRetry: () => void
  /** Real project-level count from the booking-availability response — not a per-day/per-slot
   * count (the backend doesn't expose that), so the "pick a date" hint stays honest. */
  eligibleFoCount: number
  city?: string
}

const RANGE_DAYS = 30

// Matches the prototype's day-strip (30-day date pills, click reveals its slot row) — real
// green/red availability only, no fabricated per-day/per-slot FO counts (see ui-revisions.md).
const DayStripAvailability = ({
  availability, campTimeSlots, selectedDate, selectedSlot, onDateSelect, onSlotSelect,
  isLoading, error, onRetry, eligibleFoCount, city,
}: DayStripAvailabilityProps) => {
  const today = startOfToday()
  const days = Array.from({ length: RANGE_DAYS }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    return d
  })

  const selectedDay = selectedDate ? availability[selectedDate] : undefined

  return (
    <div>
      <div className="flex items-center gap-4 mb-2 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success-soft" /> FO free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger-soft" /> all booked
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1.5">
        {days.map((day) => {
          const key = dayKeyOf(day)
          const entry = availability[key]
          // While loading/erroring, a day has no entry yet — "not known" must never render as a
          // confirmed "closed" day (a failed request would then look like a fully-booked range).
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
      </div>

      {isLoading && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>Loading availability…</p>
      )}

      {Boolean(error) && (
        <p className="text-[12px] mt-1.5 flex items-center gap-2" style={{ color: 'var(--qms-danger)' }}>
          Couldn't load availability for this range.
          <button type="button" onClick={onRetry} className="underline font-semibold">Retry</button>
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
          ↑ Pick a date — {eligibleFoCount} FO{eligibleFoCount === 1 ? '' : 's'} can run this camp{city ? ` near ${city}` : ''}
        </p>
      )}

      <p className="text-[11px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>
        Availability is checked when you choose a location and may change before confirmation.
      </p>
    </div>
  )
}

export default DayStripAvailability
