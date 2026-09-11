import type { AppointmentEntity } from '@/types/appointment.types'
import { appointmentChipColor, appointmentRefName } from '@/features/crm/appointments/appointmentsReal.utils'
import MonthCalendarGrid from '@/components/widgets/month-calendar-grid/MonthCalendarGrid'

interface AppointmentMonthGridProps {
  cursor: Date
  appointments: AppointmentEntity[]
  onPickDate: (date: Date) => void
}

// Stable references — required for MonthCalendarGrid's internal bucketing
// memoization to actually skip recomputation across renders.
const appointmentDate = (a: AppointmentEntity) => a.duration.startTime
const appointmentSortKey = (a: AppointmentEntity) => a.duration.startTime
const formatAppointmentCountBadge = (n: number) => `${n} apt`

// Adapted from the prototype's MonthGrid.tsx — same density/summary layout
// (6x7 cells, up to 3 color chips + "+N more"), now delegated to the shared
// MonthCalendarGrid. No peer-BUSY branch (see AppointmentWeekGrid.tsx's
// comment on the 2026-07-27 own-scope decision).
const AppointmentMonthGrid = ({ cursor, appointments, onPickDate }: AppointmentMonthGridProps) => {
  return (
    <MonthCalendarGrid<AppointmentEntity>
      cursor={cursor}
      items={appointments}
      getDate={appointmentDate}
      sortKey={appointmentSortKey}
      formatCountBadge={formatAppointmentCountBadge}
      onDayClick={(day) => onPickDate(day)}
      renderDayItems={(dayAppointments) => (
        <>
          {dayAppointments.map((a) => (
            <div
              key={a.id}
              className="h-1 rounded-full"
              style={{ background: appointmentChipColor(a) }}
              title={appointmentRefName(a.contactPerson) ?? 'Appointment'}
            />
          ))}
        </>
      )}
    />
  )
}

export default AppointmentMonthGrid
