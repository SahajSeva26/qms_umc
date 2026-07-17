import type { Meeting } from '@/types/meeting.types'
import {
  addDays,
  chipColor,
  darken,
  dayKey,
  DAY_START_HOUR,
  formatTimeRange,
  HOUR_PX,
  HOURS,
  isMomLate,
  isSameDay,
} from '@/features/crm/appointments/appointments.utils'

interface WeekGridProps {
  weekStart: Date
  meetings: Meeting[]
  meId: string
  onOpen: (id: string) => void
  onSlotClick: (day: Date, hour: number) => void
}

const BODY_HEIGHT = HOURS.length * HOUR_PX
const PEER_GRAY = '#94a3b8'

const WeekGrid = ({ weekStart, meetings, meId, onOpen, onSlotClick }: WeekGridProps) => {
  const now = new Date()
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const byDay = new Map<string, Meeting[]>()
  for (const m of meetings) {
    const key = dayKey(new Date(m.startAt))
    byDay.set(key, [...(byDay.get(key) ?? []), m])
  }

  const nowOffset = (now.getHours() + now.getMinutes() / 60 - DAY_START_HOUR) * HOUR_PX

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}>
      <div className="overflow-x-auto">
        <div className="min-w-[880px]">
          {/* Header row: weekday + date number */}
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

          {/* Body: hour gutter + 7 day columns */}
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
              const dayMeetings = byDay.get(dayKey(day)) ?? []
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

                  {dayMeetings.map((m) => {
                    const start = new Date(m.startAt)
                    const end = new Date(m.endAt)
                    const top = Math.max(0, (start.getHours() + start.getMinutes() / 60 - DAY_START_HOUR) * HOUR_PX) + 2
                    const durationHrs = Math.max(0, (end.getTime() - start.getTime()) / 3_600_000)
                    const height = Math.max(24, durationHrs * HOUR_PX - 4)

                    if (m.ownerId !== meId) {
                      return (
                        <div
                          key={m.id}
                          title={`${m.ownerName} is busy`}
                          className="absolute inset-x-0.5 z-[5] rounded-md px-1.5 py-1 text-white cursor-not-allowed overflow-hidden"
                          style={{ top, height, background: PEER_GRAY, borderLeft: `3px solid ${darken(PEER_GRAY)}` }}
                        >
                          <div className="text-[10px] font-bold truncate">BUSY · {m.ownerName.split(' ')[0]}</div>
                          <div className="text-[10px] opacity-90 truncate">{formatTimeRange(m.startAt, m.endAt)}</div>
                        </div>
                      )
                    }

                    const color = chipColor(m)
                    const cancelled = m.status === 'CANCELLED'
                    return (
                      <button
                        key={m.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpen(m.id)
                        }}
                        className={`absolute inset-x-0.5 z-[5] rounded-md px-1.5 py-1 text-left text-white overflow-hidden ${cancelled ? 'line-through opacity-70' : ''}`}
                        style={{ top, height, background: color, borderLeft: `3px solid ${darken(color)}` }}
                      >
                        <div className="text-[10px] font-bold truncate">{m.type} · {m.status}</div>
                        <div className="text-[11px] font-semibold truncate">{m.pharmaName} · {m.contactName}</div>
                        <div className="text-[10px] opacity-90 truncate">{formatTimeRange(m.startAt, m.endAt)}</div>
                        {m.status === 'PLANNED' && isMomLate(m) && (
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

export default WeekGrid
