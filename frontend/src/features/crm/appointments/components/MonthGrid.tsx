import type { Meeting } from '@/types/meeting.types'
import { addDays, chipColor, dayKey, isSameDay, startOfWeek } from '@/features/crm/appointments/appointments.utils'

interface MonthGridProps {
  cursor: Date
  meetings: Meeting[]
  meId: string
  onPickDate: (date: Date) => void
}

const PEER_GRAY = '#94a3b8'

const MonthGrid = ({ cursor, meetings, meId, onPickDate }: MonthGridProps) => {
  const now = new Date()
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(monthStart)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  const byDay = new Map<string, Meeting[]>()
  for (const m of meetings) {
    const key = dayKey(new Date(m.startAt))
    byDay.set(key, [...(byDay.get(key) ?? []), m])
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
          const dayMeetings = (byDay.get(dayKey(day)) ?? []).slice().sort((a, b) => a.startAt.localeCompare(b.startAt))
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
                {dayMeetings.length > 0 && (
                  <span className="text-[9px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
                    {dayMeetings.length} mtg
                  </span>
                )}
              </div>
              <div className="mt-1.5 space-y-1">
                {dayMeetings.slice(0, 3).map((m) => {
                  const isPeer = m.ownerId !== meId
                  return (
                    <div
                      key={m.id}
                      className="h-1 rounded-full"
                      style={{ background: isPeer ? PEER_GRAY : chipColor(m) }}
                      title={isPeer ? `BUSY · ${m.ownerName}` : `${m.pharmaName} · ${m.contactName}`}
                    />
                  )
                })}
                {dayMeetings.length > 3 && (
                  <div className="text-[9px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
                    +{dayMeetings.length - 3} more
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

export default MonthGrid
