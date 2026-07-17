import { FiBell } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import { auditIssues, campStatus } from '@/features/om/om.service'
import { Button } from '@/components/ui/button'
import { clientName, foName } from '@/types/campref.types'
import { usePeopleData, personName } from '@/hooks/usePeopleData'
import { toast } from '@/components/ui/sonner'
import { formatDate } from '@/utils/formatters'

interface AuditTabProps {
  camps: Camp[]
  mode: 'Screening' | 'Diet'
}

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: '#94a3b8', UPCOMING: '#3b6dff', ONGOING: '#10b981', COMPLETED: '#14b8a6', OVERDUE: '#f43f5e', CANCELLED: '#f59e0b', CANCELLED_CHARGED: '#f43f5e',
}

const Flag = ({ missing, label }: { missing: boolean; label: string }) => (
  <span
    className="text-[10px] font-bold px-2 py-0.5 rounded"
    style={missing ? { background: 'var(--danger-soft)', color: 'var(--danger)' } : { background: 'var(--success-soft)', color: 'var(--success)' }}
  >
    {missing ? label : 'OK'}
  </span>
)

// Mirrors tabAudit() exactly (om-portal.js:1341-1387) — flags COMPLETED/
// ONGOING/OVERDUE camps missing photos/report/patient-count. omNudge() in
// the prototype is a toast-only stub (no real notification integration) —
// matched exactly, not a corner cut for this port.
const AuditTab = ({ camps, mode }: AuditTabProps) => {
  const { people } = usePeopleData()
  const isDiet = mode === 'Diet'
  const subjCol = isDiet ? 'Dietitian' : 'FO'
  const modeCamps = camps.filter((c) => c.type === mode)
  const issues = auditIssues(modeCamps)
  const photoMiss = issues.filter((i) => i.photosMissing).length
  const reportMiss = issues.filter((i) => i.reportMissing).length
  const countMiss = issues.filter((i) => i.countMissing).length

  const handleNudge = (camp: Camp) => {
    const who = isDiet ? personName(people, camp.dietitianId) : foName(camp.foId)
    toast.success(`Reminder sent to ${who || (isDiet ? 'Dietitian' : 'FO')} for ${camp.id}`)
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Camps with audit issues</div>
          <div className="text-[22px] font-extrabold" style={{ color: '#f43f5e' }}>{issues.length}</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{mode} camps</div>
        </div>
        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Photos missing</div>
          <div className="text-[22px] font-extrabold" style={{ color: '#f59e0b' }}>{photoMiss}</div>
        </div>
        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Patient report missing</div>
          <div className="text-[22px] font-extrabold" style={{ color: '#f59e0b' }}>{reportMiss}</div>
        </div>
        <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Patient count missing</div>
          <div className="text-[22px] font-extrabold" style={{ color: '#f59e0b' }}>{countMiss}</div>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="px-3.5 py-3 border-b text-[13px] font-extrabold" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}>
          Audit report — post-camp data gaps
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Camp', 'Company', subjCol, 'Status', 'Photos', 'Patient report', 'Patient count', ''].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => {
                const camp = modeCamps.find((c) => c.id === issue.campId)
                if (!camp) return null
                const subjName = isDiet ? personName(people, camp.dietitianId) : foName(camp.foId)
                const status = campStatus(camp)
                return (
                  <tr key={issue.campId} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-3 py-2.5">
                      <div className="font-extrabold" style={{ color: 'var(--qms-text)' }}>{camp.id}</div>
                      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(camp.date)} · {camp.city ?? ''}</div>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{clientName(camp.clientId)}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{subjName || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${STATUS_COLOR[status]}22`, color: STATUS_COLOR[status] }}>{status}</span>
                    </td>
                    <td className="px-3 py-2.5"><Flag missing={issue.photosMissing} label="PHOTOS MISSING" /></td>
                    <td className="px-3 py-2.5"><Flag missing={issue.reportMissing} label="REPORT MISSING" /></td>
                    <td className="px-3 py-2.5"><Flag missing={issue.countMissing} label="COUNT MISSING" /></td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => handleNudge(camp)}><FiBell size={12} /> Nudge {subjCol}</Button>
                    </td>
                  </tr>
                )
              })}
              {issues.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-[13px]" style={{ color: 'var(--success)' }}>✓ No audit issues — all {mode} camps have complete post-camp data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AuditTab
