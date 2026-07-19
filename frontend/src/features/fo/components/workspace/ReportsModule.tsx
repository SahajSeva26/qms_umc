import { useMemo } from 'react'
import { FiCheckCircle, FiClock, FiUsers, FiExternalLink } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import { Button } from '@/components/ui/button'
import KpiTile from '@/components/ui/KpiTile'
import { formatDate } from '@/utils/formatters'
import { stubOpenCamp } from '@/features/fo/components/fo.ui'

interface ReportsModuleProps {
  me: Person
  camps: Camp[]
  onOpenCamp?: (id: string) => void
}

// Aggregate "closed" bucket — COMPLETE_WITHOUT_REPORT counts as closed for display purposes.
const CLOSED_STATUSES: Camp['status'][] = ['CLOSED', 'COMPLETE', 'COMPLETE_WITHOUT_REPORT']
// "Pending closure" must still surface COMPLETE_WITHOUT_REPORT camps — that status means the FO
// hasn't finished uploading reports yet, which is exactly what this module exists to surface.
const FINISHED_STATUSES: Camp['status'][] = ['CLOSED', 'COMPLETE']
const NOT_CANCELLED: Camp['status'][] = ['CANCELLED', 'CANCELLED_CHARGED']

const ReportsModule = ({ camps, onOpenCamp }: ReportsModuleProps) => {
  const todayIso = new Date().toISOString().slice(0, 10)

  const closed = useMemo(() => camps.filter((c) => CLOSED_STATUSES.includes(c.status)), [camps])

  const pendingClosure = useMemo(() => camps.filter((c) => {
    if (NOT_CANCELLED.includes(c.status) || FINISHED_STATUSES.includes(c.status)) return false
    const isPastUnclosed = (c.date?.slice(0, 10) ?? '') < todayIso
    return c.status === 'INCOMPLETE' || c.status === 'COMPLETE_WITHOUT_REPORT' || isPastUnclosed
  }), [camps, todayIso])

  const lifetimePatients = useMemo(() => closed.reduce((s, c) => s + (c.patientsDone || c.patientCount || 0), 0), [closed])

  const handleOpen = (id: string) => {
    if (onOpenCamp) onOpenCamp(id)
    else stubOpenCamp(id)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        <KpiTile label="Closed" value={String(closed.length)} tone="emerald" icon={FiCheckCircle} />
        <KpiTile label="Pending closure" value={String(pendingClosure.length)} tone="rose" icon={FiClock} />
        <KpiTile label="Patients lifetime" value={String(lifetimePatients)} tone="brand" icon={FiUsers} />
      </div>

      {pendingClosure.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--danger-soft)', borderColor: 'var(--qms-border)' }}>
          <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--danger)' }}>Pending closure</div>
          <div>
            {pendingClosure.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{c.id} <span className="font-normal" style={{ color: 'var(--qms-text-muted)' }}>· {c.type}</span></div>
                  <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(c.date)} · {c.city}</div>
                </div>
                <Button size="sm" onClick={() => handleOpen(c.id)}>Close</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Closed camps</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Camp', 'Date', 'City', 'Patients', 'Closed at', ''].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {closed.map((c) => (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-3 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{c.id} <span className="font-normal text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{c.type}</span></td>
                  <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(c.date)}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--qms-text-soft)' }}>{c.city}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{c.patientsDone || c.patientCount || 0}</td>
                  <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{c.closedAt ? formatDate(c.closedAt) : '—'}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="ghost" onClick={() => handleOpen(c.id)}><FiExternalLink size={13} /></Button>
                  </td>
                </tr>
              ))}
              {closed.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No closed camps yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ReportsModule
