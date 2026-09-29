import type { AppointmentEntity } from '@/types/appointment.types'
import { APPOINTMENT_TYPE_LABEL } from '@/types/appointment.types'
import { appointmentChipColor, appointmentRefName } from '@/features/crm/appointments/appointmentsReal.utils'
import MonthCalendarGrid from '@/components/widgets/month-calendar-grid/MonthCalendarGrid'

interface AppointmentMonthGridProps {
  cursor: Date
  appointments: AppointmentEntity[]
  // Carries the day's own appointments so the caller can distinguish "empty
  // day → create" from "day has appointments → open one" (a day cell has no
  // room to render its chips as separately-clickable elements, unlike Week
  // view's chips, which are real <button>s with their own onOpen handler).
  onPickDate: (date: Date, dayAppointments: AppointmentEntity[]) => void
}

// Stable references — required for MonthCalendarGrid's internal bucketing
// memoization to actually skip recomputation across renders.
const appointmentDate = (a: AppointmentEntity) => a.duration.startTime
const appointmentSortKey = (a: AppointmentEntity) => a.duration.startTime
const formatAppointmentCountBadge = (n: number) => `${n} apt`

// Adapted from the prototype's renderMonthGrid() — same density/summary layout
// (6x7 cells, up to 3 chips + "+N more"), now delegated to the shared
// MonthCalendarGrid. Chips are colored text pills ("Type · Contact"), matching
// the prototype's own tiny-pill treatment, not bare color dots. No peer-BUSY
// branch (see AppointmentWeekGrid.tsx's comment on the 2026-07-27 own-scope decision).
const AppointmentMonthGrid = ({ cursor, appointments, onPickDate }: AppointmentMonthGridProps) => {
  return (
    <MonthCalendarGrid<AppointmentEntity>
      cursor={cursor}
      items={appointments}
      getDate={appointmentDate}
      sortKey={appointmentSortKey}
      formatCountBadge={formatAppointmentCountBadge}
      onDayClick={(day, dayAppointments) => onPickDate(day, dayAppointments)}
      renderDayItems={(dayAppointments) => (
        <>
          {dayAppointments.map((a) => (
            <div
              key={a.id}
              className="text-[10px] font-semibold text-white truncate px-1 py-0.5 rounded-[5px]"
              style={{ background: appointmentChipColor(a) }}
              title={appointmentRefName(a.contactPerson) ?? 'Appointment'}
            >
              {APPOINTMENT_TYPE_LABEL[a.type]} · {appointmentRefName(a.contactPerson) ?? 'Contact'}
            </div>
          ))}
        </>
      )}
    />
  )
}

export default AppointmentMonthGrid
