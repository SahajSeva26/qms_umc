import { useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import type { LeadEntity } from '@/types/crm.types'
import { LEAD_STATUS_COLOR, LEAD_STATUS_LABEL, LEAD_STATUS_TEXT_COLOR } from '@/types/crm.types'
import { formatINR } from '@/utils/formatters'
import MonthCalendarGrid from '@/components/widgets/month-calendar-grid/MonthCalendarGrid'

interface CalendarViewProps {
  leads: LeadEntity[]
  onOpen: (id: string) => void
}

const MONTH_LABEL = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })

// Stable references — required for MonthCalendarGrid's internal bucketing
// memoization to actually skip recomputation across renders.
const leadDate = (l: LeadEntity) => l.followUpDate ?? null
const leadSortKey = (l: LeadEntity) => l.followUpDate ?? ''
const formatLeadCountBadge = (n: number) => `${n} lead${n === 1 ? '' : 's'}`

const CalendarView = ({ leads, onOpen }: CalendarViewProps) => {
  const [cursor, setCursor] = useState(() => new Date())
  const [pickedDay, setPickedDay] = useState<Date | null>(null)
  const [pickedLeads, setPickedLeads] = useState<LeadEntity[]>([])

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

      <MonthCalendarGrid<LeadEntity>
        cursor={cursor}
        items={leads}
        getDate={leadDate}
        sortKey={leadSortKey}
        formatCountBadge={formatLeadCountBadge}
        onDayClick={(day, dayLeads) => {
          setPickedDay(day)
          setPickedLeads(dayLeads)
        }}
        renderDayItems={(dayLeads) => (
          <>
            {dayLeads.map((lead) => (
              <div
                key={lead.id}
                className="text-[9px] font-semibold truncate rounded px-1 py-0.5"
                style={{ background: `color-mix(in srgb, ${LEAD_STATUS_COLOR[lead.status]} 13%, transparent)`, color: LEAD_STATUS_TEXT_COLOR[lead.status] }}
                title={`${lead.title} · ${LEAD_STATUS_LABEL[lead.status]}`}
              >
                {lead.title}
              </div>
            ))}
          </>
        )}
        renderUndatedFooter={(undatedLeads) => (
          <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            {undatedLeads.length} lead{undatedLeads.length === 1 ? '' : 's'} with no follow-up date set — not shown on the calendar.
          </p>
        )}
      />

      {pickedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 supports-backdrop-filter:backdrop-blur-sm" style={{ background: 'rgba(0,0,0,.4)' }} onClick={() => setPickedDay(null)}>
          <div
            className="w-full max-w-md rounded-2xl border p-4 max-h-[70vh] overflow-y-auto"
            style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
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
                        style={{ background: `color-mix(in srgb, ${LEAD_STATUS_COLOR[lead.status]} 13%, transparent)`, color: LEAD_STATUS_TEXT_COLOR[lead.status] }}
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
