import type { AppointmentEntity } from '@/types/appointment.types'
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_TYPE_LABEL } from '@/types/appointment.types'
import { addDays, dayKey, DAY_START_HOUR, HOUR_PX, HOURS, isSameDay } from '@/features/crm/appointments/appointments.utils'
import { appointmentChipColor, appointmentRefName, darken, isMomOverdue } from '@/features/crm/appointments/appointmentsReal.utils'

interface AppointmentWeekGridProps {
  weekStart: Date
  appointments: AppointmentEntity[]
  onOpen: (id: string) => void
  onSlotClick: (day: Date, hour: number) => void
}

const BODY_HEIGHT = HOURS.length * HOUR_PX

// Adapted from the prototype's WeekGrid.tsx / sales-calendar.js's
// renderWeekGrid — same layout (60px hour gutter + 7 day columns, dashed
// hour rows, red current-time line). Per the 2026-07-27 decision (own-scope
// only, no peer-overlay): every appointment fetched here is already one the
// viewer can legitimately see (owner or invited member) per the backend's
// own applyOwnScope, so there is no "peer, agenda hidden" branch to render.
const AppointmentWeekGrid = ({ weekStart, appointments, onOpen, onSlotClick }: AppointmentWeekGridProps) => {
  const now = new Date()
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const byDay = new Map<string, AppointmentEntity[]>()
  for (const a of appointments) {
    const key = dayKey(new Date(a.duration.startTime))
    byDay.set(key, [...(byDay.get(key) ?? []), a])
  }

  const nowOffset = (now.getHours() + now.getMinutes() / 60 - DAY_START_HOUR) * HOUR_PX

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}>
      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid var(--qms-border)' }}>
            <div />
            {days.map((day) => {
              const today = isSameDay(day, now)
              return (
                <div
                  key={day.toISOString()}
                  className="py-2 text-center"
                  style={{ borderLeft: '1px solid var(--qms-border)', ...(today ? { background: 'rgba(59,109,255,.08)' } : {}) }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: today ? 'var(--qms-brand)' : 'var(--qms-text-muted)' }}>
                    {day.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </div>
                  <div className="text-[15px] font-bold leading-tight" style={{ color: today ? 'var(--qms-brand)' : 'var(--qms-text)' }}>
                    {day.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            <div>
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-end pr-1.5 pt-0.5 text-[10px]"
                  style={{ height: HOUR_PX, borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text-soft)' }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {days.map((day) => {
              const today = isSameDay(day, now)
              const dayAppointments = byDay.get(dayKey(day)) ?? []
              return (
                <div
                  key={day.toISOString()}
                  className="relative"
                  style={{
                    minHeight: BODY_HEIGHT,
                    borderLeft: '1px solid var(--qms-border)',
                    ...(today ? { background: 'rgba(59,109,255,.03)' } : {}),
                  }}
                >
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="cursor-pointer"
                      style={{ height: HOUR_PX, borderBottom: '1px dashed var(--qms-border)' }}
                      onClick={() => onSlotClick(day, h)}
                    />
                  ))}

                  {today && nowOffset >= 0 && nowOffset <= BODY_HEIGHT && (
                    <div className="absolute inset-x-0 z-10 pointer-events-none" style={{ top: nowOffset }}>
                      <div className="relative h-0.5" style={{ background: 'var(--danger)' }}>
                        <span className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }} />
                      </div>
                    </div>
                  )}

                  {dayAppointments.map((a) => {
                    const start = new Date(a.duration.startTime)
                    const end = a.duration.endTime ? new Date(a.duration.endTime) : new Date(start.getTime() + 3_600_000)
                    const top = Math.max(0, (start.getHours() + start.getMinutes() / 60 - DAY_START_HOUR) * HOUR_PX) + 2
                    const durationHrs = Math.max(0, (end.getTime() - start.getTime()) / 3_600_000)
                    const height = Math.max(24, durationHrs * HOUR_PX - 4)
                    const color = appointmentChipColor(a)
                    const cancelled = a.status === 'cancelled'
                    const overdue = isMomOverdue(a)

                    return (
                      <button
                        key={a.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpen(a.id)
                        }}
                        className={`absolute inset-x-0.5 z-[5] rounded-md px-1.5 py-1 text-left text-white overflow-hidden ${cancelled ? 'line-through opacity-70' : ''}`}
                        style={{ top, height, background: color, borderLeft: `3px solid ${darken(color)}` }}
                      >
                        <div className="text-[10px] font-bold truncate">
                          {APPOINTMENT_TYPE_LABEL[a.type]} · {APPOINTMENT_STATUS_LABEL[a.status]}
                        </div>
                        <div className="text-[11px] font-semibold truncate">{appointmentRefName(a.contactPerson) ?? 'Contact'}</div>
                        <div className="text-[10px] opacity-90 truncate">
                          {start.toTimeString().slice(0, 5)}–{end.toTimeString().slice(0, 5)}
                        </div>
                        {a.status === 'planned' && overdue && (
                          <span className="absolute bottom-0.5 right-1 text-[9px] font-bold px-1 rounded" style={{ background: 'rgba(0,0,0,.35)' }}>
                            ⚠ MOM
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppointmentWeekGrid
