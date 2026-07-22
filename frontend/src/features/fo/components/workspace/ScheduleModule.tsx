import { useMemo, useState } from 'react'
import { FiPlay, FiCheckCircle } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/utils/formatters'
import MiniCalendar from '@/features/fo/components/workspace/MiniCalendar'
import { isCampRunnable } from '@/features/fo/components/workspace/DashboardModule'

interface ScheduleModuleProps {
  me: Person
  camps: Camp[]
  onRunCamp: (campId: string) => void
}

type ViewId = 'list' | 'calendar' | 'past'

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'list', label: 'List' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'past', label: 'Past' },
]

const NOT_CANCELLED: Camp['status'][] = ['CANCELLED', 'CANCELLED_CHARGED']
// "Finished" = prototype's isCompleted() — excludes COMPLETE_WITHOUT_REPORT, which still needs the
// FO to finish closure paperwork (mirrors DashboardModule's split; Past view = prototype's myClosed()).
const FINISHED_STATUSES: Camp['status'][] = ['CLOSED', 'COMPLETE']

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function buttonLabel(c: Camp): string {
  if (c.status === 'LIVE' || c.status === 'COMPLETE_WITHOUT_REPORT') return 'Finish'
  if (c.checkInAt) return 'Continue'
  return 'Run'
}

const ScheduleModule = ({ me, camps, onRunCamp }: ScheduleModuleProps) => {
  const [view, setView] = useState<ViewId>('list')
  const today = todayIso()

  const myCamps = useMemo(() => camps.filter((c) => c.foId === me.id), [camps, me.id])

  const listRows = useMemo(() => {
    return myCamps
      .filter((c) => {
        const isPastUnclosed = (c.date?.slice(0, 10) ?? '') < today && !FINISHED_STATUSES.includes(c.status) && !NOT_CANCELLED.includes(c.status)
        return (c.date?.slice(0, 10) ?? '') >= today || c.status === 'REQUESTED' || isPastUnclosed
      })
      .sort((a, b) => (a.date < b.date ? -1 : 1))
  }, [myCamps, today])

  const pastRows = useMemo(() => {
    return myCamps
      .filter((c) => FINISHED_STATUSES.includes(c.status))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [myCamps])

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border p-1 w-fit" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors"
            style={{
              background: view === v.id ? 'var(--qms-brand)' : 'transparent',
              color: view === v.id ? '#fff' : 'var(--qms-text-muted)',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'list' && (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Today, upcoming &amp; pending</div>
          <div>
            {listRows.map((c) => {
              const runnable = isCampRunnable(c, today)
              const isToday = c.date?.slice(0, 10) === today
              return (
                <div key={c.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate text-[13px]" style={{ color: 'var(--qms-text)' }}>
                      {c.id} <span className="font-normal" style={{ color: 'var(--qms-text-muted)' }}>· {c.type}</span>
                      {isToday && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>TODAY</span>}
                    </div>
                    <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(c.date)} · {c.city} · {c.slot} · {c.status.replace(/_/g, ' ')}</div>
                  </div>
                  {runnable && (
                    <Button size="sm" onClick={() => onRunCamp(c.id)}><FiPlay size={12} /> {buttonLabel(c)}</Button>
                  )}
                </div>
              )
            })}
            {listRows.length === 0 && (
              <div className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No camps to show.</div>
            )}
          </div>
        </div>
      )}

      {view === 'calendar' && (
        <MiniCalendar camps={myCamps} onSelectDay={(dayCamps) => { if (dayCamps[0]) onRunCamp(dayCamps[0].id) }} />
      )}

      {view === 'past' && (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Closed camps</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: 'var(--qms-surface-strong)' }}>
                  {['Camp', 'Date', 'City', 'Patients', 'Status'].map((h) => (
                    <th key={h} className="text-left font-semibold px-3 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pastRows.map((c) => (
                  <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{c.id} <span className="font-normal text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{c.type}</span></td>
                    <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(c.date)}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text-soft)' }}>{c.city}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{c.patientsDone || c.patientCount || 0}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}><FiCheckCircle size={10} /> {c.status.replace(/_/g, ' ')}</span>
                    </td>
                  </tr>
                ))}
                {pastRows.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No closed camps yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleModule
