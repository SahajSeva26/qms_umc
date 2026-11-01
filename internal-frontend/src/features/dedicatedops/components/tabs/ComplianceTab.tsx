import { FiRadio, FiClipboard, FiUserPlus, FiBriefcase } from 'react-icons/fi'
import type { ComplianceResult } from '@/features/dedicatedops/dedicatedops.types'
import KpiTile from '@/components/ui/KpiTile'
import { Button } from '@/components/ui/button'
import DoPill from '@/features/dedicatedops/components/DoPill'

interface ComplianceTabProps {
  /** Already filtered + sorted by useDedicatedOpsCompliance (Phase 2) — do not re-filter/re-sort here. */
  nonCompliant: ComplianceResult[]
  overdueCount: number
  inProgressCount: number
  fullyCompliantCount: number
  totalTrackedCount: number
}

// SOP-compliance KPI strip + non-compliant-FO table. Pure render — the
// filtering/sorting that produces `nonCompliant` lives in
// useDedicatedOpsCompliance, shared with ProjectsTab/LiveTab's own KPI
// numbers so none of it is computed twice.
//
// "Nudge" is an intentional unwired placeholder (matches the prototype's
// escalation-chain concept) — left alone per the existing decision not to
// invent behavior for it.
const ComplianceTab = ({ nonCompliant, overdueCount, inProgressCount, fullyCompliantCount, totalTrackedCount }: ComplianceTabProps) => {
  return (
    <>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <KpiTile label="Overdue" value={String(overdueCount)} tone="rose" icon={FiRadio} />
        <KpiTile label="In progress" value={String(inProgressCount)} tone="amber" icon={FiClipboard} />
        <KpiTile label="Fully compliant" value={String(fullyCompliantCount)} tone="emerald" icon={FiUserPlus} />
        <KpiTile label="Total tracked" value={String(totalTrackedCount)} tone="brand" icon={FiBriefcase} />
      </div>
      <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: 'var(--qms-surface-strong)' }}>
              {['FO · Project', 'SOP', 'Missing', 'Since', 'Status', ''].map((h) => (
                <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nonCompliant.map((c) => (
              <tr key={c.foId} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <td className="px-3 py-2.5">
                  <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{c.foName}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{c.projectId}</div>
                </td>
                <td className="px-3 py-2.5 tabular-nums" style={{ color: 'var(--qms-text)' }}>{c.done}/{c.total}</td>
                <td className="px-3 py-2.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                  {c.checks.filter((chk) => !chk.ok).map((chk) => chk.label).join(' · ')}
                </td>
                <td className="px-3 py-2.5 text-[11px] tabular-nums" style={{ color: 'var(--qms-text-muted)' }}>{Math.round(c.overdueHours)}h</td>
                <td className="px-3 py-2.5"><DoPill tone={c.overdue ? 'bad' : 'warn'}>{c.overdue ? 'Overdue' : 'In progress'}</DoPill></td>
                <td className="px-3 py-2.5"><Button size="sm" variant="outline">Nudge</Button></td>
              </tr>
            ))}
            {nonCompliant.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>Everyone is fully compliant today.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default ComplianceTab
