import type { AppointmentEntity } from '@/features/crm/appointments/appointment.types'
import { addDays, dayKey, isSameDay, startOfWeek } from '@/features/crm/appointments/appointments.utils'
import { appointmentChipColor, appointmentRefName } from '@/features/crm/appointments/appointmentsReal.utils'

interface AppointmentMonthGridProps {
  cursor: Date
  appointments: AppointmentEntity[]
  onPickDate: (date: Date) => void
}

// Adapted from the prototype's MonthGrid.tsx — same density/summary layout
// (6x7 cells, up to 3 color chips + "+N more"). No peer-BUSY branch (see
// AppointmentWeekGrid.tsx's comment on the 2026-07-27 own-scope decision).
const AppointmentMonthGrid = ({ cursor, appointments, onPickDate }: AppointmentMonthGridProps) => {
  const now = new Date()
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(monthStart)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  const byDay = new Map<string, AppointmentEntity[]>()
  for (const a of appointments) {
    const key = dayKey(new Date(a.duration.startTime))
    byDay.set(key, [...(byDay.get(key) ?? []), a])
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}>
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--qms-border)' }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth()
          const today = isSameDay(day, now)
          const dayAppointments = (byDay.get(dayKey(day)) ?? []).slice().sort((a, b) => a.duration.startTime.localeCompare(b.duration.startTime))
          return (
            <button
              key={day.toISOString()}
              onClick={() => onPickDate(day)}
              className={`min-h-[92px] p-1.5 text-left border-b border-r transition-colors hover:bg-(--qms-surface-hover) ${inMonth ? '' : 'opacity-45'}`}
              style={{ borderColor: 'var(--qms-border)', ...(today ? { background: 'rgba(59,109,255,.08)' } : {}) }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[12px] font-bold" style={{ color: today ? 'var(--qms-brand)' : 'var(--qms-text)' }}>
                  {day.getDate()}
                </span>
                {dayAppointments.length > 0 && (
                  <span className="text-[9px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
                    {dayAppointments.length} apt
                  </span>
                )}
              </div>
              <div className="mt-1.5 space-y-1">
                {dayAppointments.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    className="h-1 rounded-full"
                    style={{ background: appointmentChipColor(a) }}
                    title={appointmentRefName(a.contactPerson) ?? 'Appointment'}
                  />
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-[9px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default AppointmentMonthGrid
