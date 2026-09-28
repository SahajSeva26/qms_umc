import { addMonths, format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
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

interface DateSlotAvailabilityGridProps {
  availability: Record<string, BookingAvailabilityDayEntry>
  campTimeSlots: CampTimeSlotValue[]
  selectedDate: string
  selectedSlot: CampTimeSlotValue | ''
  onDateSelect: (date: string) => void
  onSlotSelect: (slot: CampTimeSlotValue) => void
  month: Date
  onMonthChange: (month: Date) => void
  isLoading: boolean
  error: unknown
  onRetry: () => void
}

const DateSlotAvailabilityGrid = ({
  availability,
  campTimeSlots,
  selectedDate,
  selectedSlot,
  onDateSelect,
  onSlotSelect,
  month,
  onMonthChange,
  isLoading,
  error,
  onRetry,
}: DateSlotAvailabilityGridProps) => {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Date &amp; time slot *
      </p>

      <div className="flex items-center gap-4 mb-2 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success-soft" /> At least one FO available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger-soft" /> No field officer available
        </span>
      </div>

      <Calendar
        mode="single"
        required
        numberOfMonths={2}
        pagedNavigation
        showOutsideDays={false}
        selected={selectedDate ? new Date(`${selectedDate}T00:00:00`) : undefined}
        onSelect={(date) => onDateSelect(format(date, 'yyyy-MM-dd'))}
        month={month}
        onMonthChange={onMonthChange}
        captionLayout="dropdown"
        startMonth={startOfToday()}
        endMonth={addMonths(startOfToday(), 12)}
        disabled={(date) =>
          date < startOfToday() ||
          date > addMonths(startOfToday(), 12) ||
          availability[dayKeyOf(date)]?.available !== true
        }
        modifiers={{
          bookable: (date) => availability[dayKeyOf(date)]?.available === true,
          unbookable: (date) => availability[dayKeyOf(date)]?.available === false,
        }}
        modifiersClassNames={{
          bookable: 'bg-success-soft',
          unbookable: 'bg-danger-soft',
        }}
      />

      {isLoading && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          Loading availability…
        </p>
      )}

      {Boolean(error) && (
        <p className="text-[12px] mt-1.5 flex items-center gap-2" style={{ color: 'var(--qms-danger)' }}>
          Couldn't load availability for this month.
          <button type="button" onClick={onRetry} className="underline font-semibold">Retry</button>
        </p>
      )}

      {selectedDate && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
            {format(new Date(`${selectedDate}T00:00:00`), 'EEEE, d MMM yyyy')}
          </p>
          {campTimeSlots.map((slot) => (
            <AvailabilitySlotPill
              key={slot}
              label={CAMP_TIME_SLOT_LABEL[slot]}
              available={availability[selectedDate]?.slots[slot] ?? false}
              selected={selectedSlot === slot}
              onClick={() => onSlotSelect(slot)}
            />
          ))}
        </div>
      )}

      <p className="text-[11px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>
        Availability is checked when you choose a location and may change before confirmation.
      </p>
    </div>
  )
}

export default DateSlotAvailabilityGrid
