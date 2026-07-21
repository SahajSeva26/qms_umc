import { useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import type { LeadEntity } from '@/types/crm.types'
import { LEAD_STATUS_COLOR, LEAD_STATUS_LABEL } from '@/types/crm.types'
import { formatINR } from '@/utils/formatters'
import { addDays, dayKey, isSameDay, startOfWeek } from '@/features/crm/appointments/appointments.utils'

interface CalendarViewProps {
  leads: LeadEntity[]
  onOpen: (id: string) => void
}

const MONTH_LABEL = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })

// Mirrors appointments/components/MonthGrid.tsx's month-grid pattern (42-cell
// Monday-first grid, today highlight, per-day item stacking with a "+N more"
// overflow) — adapted to bucket Leads by `followUpDate` instead of Meetings
// by `startAt`, since Lead has no start/end time, just a single follow-up date.
const CalendarView = ({ leads, onOpen }: CalendarViewProps) => {
  const [cursor, setCursor] = useState(() => new Date())
  const [pickedDay, setPickedDay] = useState<Date | null>(null)

  const now = new Date()
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(monthStart)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  const byDay = useMemo(() => {
    const map = new Map<string, LeadEntity[]>()
    for (const lead of leads) {
      if (!lead.followUpDate) continue
      const key = dayKey(new Date(lead.followUpDate))
      map.set(key, [...(map.get(key) ?? []), lead])
    }
    return map
  }, [leads])

  const undated = leads.filter((l) => !l.followUpDate)
  const pickedLeads = pickedDay ? (byDay.get(dayKey(pickedDay)) ?? []) : []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
          {MONTH_LABEL.format(cursor)}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-(--qms-surface-hover)"
            style={{ color: 'var(--qms-text-muted)' }}
            aria-label="Previous month"
          >
            <FiChevronLeft size={15} />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-(--qms-surface-hover)"
            style={{ color: 'var(--qms-text-muted)' }}
          >
            Today
          </button>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-(--qms-surface-hover)"
            style={{ color: 'var(--qms-text-muted)' }}
            aria-label="Next month"
          >
            <FiChevronRight size={15} />
          </button>
        </div>
      </div>

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
            const dayLeads = (byDay.get(dayKey(day)) ?? []).slice().sort((a, b) => (a.followUpDate ?? '').localeCompare(b.followUpDate ?? ''))
            return (
              <button
                key={day.toISOString()}
                onClick={() => setPickedDay(day)}
                className={`min-h-[92px] p-1.5 text-left border-b border-r transition-colors hover:bg-(--qms-surface-hover) ${inMonth ? '' : 'opacity-45'}`}
                style={{ borderColor: 'var(--qms-border)', ...(today ? { background: 'rgba(59,109,255,.08)' } : {}) }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[12px] font-bold" style={{ color: today ? 'var(--qms-brand)' : 'var(--qms-text)' }}>
                    {day.getDate()}
                  </span>
                  {dayLeads.length > 0 && (
                    <span className="text-[9px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
                      {dayLeads.length} lead{dayLeads.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 space-y-1">
                  {dayLeads.slice(0, 3).map((lead) => (
                    <div
                      key={lead.id}
                      className="text-[9px] font-semibold truncate rounded px-1 py-0.5"
                      style={{ background: `${LEAD_STATUS_COLOR[lead.status]}22`, color: LEAD_STATUS_COLOR[lead.status] }}
                      title={`${lead.title} · ${LEAD_STATUS_LABEL[lead.status]}`}
                    >
                      {lead.title}
                    </div>
                  ))}
                  {dayLeads.length > 3 && (
                    <div className="text-[9px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
                      +{dayLeads.length - 3} more
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {undated.length > 0 && (
        <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
          {undated.length} lead{undated.length === 1 ? '' : 's'} with no follow-up date set — not shown on the calendar.
        </p>
      )}

      {pickedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.4)' }} onClick={() => setPickedDay(null)}>
          <div
            className="w-full max-w-md rounded-2xl border p-4 max-h-[70vh] overflow-y-auto"
            style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
                {new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(pickedDay)}
              </h3>
              <button onClick={() => setPickedDay(null)} className="text-[12px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
                Close
              </button>
            </div>

            {pickedLeads.length === 0 ? (
              <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No leads with a follow-up on this day.</p>
            ) : (
              <div className="space-y-2">
                {pickedLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => {
                      setPickedDay(null)
                      onOpen(lead.id)
                    }}
                    className="w-full text-left rounded-xl border p-2.5 transition-colors hover:bg-(--qms-surface-hover)"
                    style={{ borderColor: 'var(--qms-border)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{lead.title}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: `${LEAD_STATUS_COLOR[lead.status]}22`, color: LEAD_STATUS_COLOR[lead.status] }}
                      >
                        {LEAD_STATUS_LABEL[lead.status]}
                      </span>
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                      {formatINR(lead.estimatedValue)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarView
