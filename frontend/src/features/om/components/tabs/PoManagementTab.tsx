import { FiAlertTriangle } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import { useProjectsDataShared } from '@/hooks/useProjectsDataShared'
import { useErp } from '@/features/om/hooks/useErp'
import { poStats, poAlerts } from '@/features/om/erp.service'
import { clientName } from '@/types/campref.types'
import { formatINR } from '@/utils/formatters'
import DoBar from '@/features/dedicatedops/components/DoBar'

interface PoManagementTabProps {
  camps: Camp[]
}

// Mirrors renderPO/poStats() exactly (erp-screening.js:117-139, 299-327) —
// per-project cards with PO consumption = accepted-completed + charged-cancelled.
const PoManagementTab = ({ camps }: PoManagementTabProps) => {
  const { projects } = useProjectsDataShared()
  const erp = useErp()

  const screeningProjects = projects.filter((p) => p.type === 'Screening')

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
      {screeningProjects.map((p) => {
        const stats = poStats(p, camps, erp.verification)
        const alerts = poAlerts(p, stats)
        const pct = stats.poQty ? Math.round((stats.consumed / stats.poQty) * 100) : 0
        const barColor = pct >= 100 ? '#ef4444' : pct >= 90 ? '#f59e0b' : '#3b6dff'

        return (
          <div key={p.id} className="rounded-xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="mb-2">
              <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{p.name}</div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{clientName(p.clientId)} · PO {p.poNo || '—'}</div>
            </div>

            {alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg mb-2" style={{ background: a.level === 'red' ? 'var(--danger-soft)' : 'var(--warning-soft)', color: a.level === 'red' ? 'var(--danger)' : 'var(--warning)' }}>
                <FiAlertTriangle size={11} /> {a.message}
              </div>
            ))}

            <div className="mb-3">
              <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>
                <span>{stats.consumed}/{stats.poQty} camps consumed</span>
                <span>{pct}%</span>
              </div>
              <DoBar pct={pct} color={barColor} />
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px]">
              {[
                ['Completed', stats.accepted],
                ['Cancelled·charged', stats.cancelledCharged],
                ['Cancelled·non', stats.cancelledNon],
                ['Rejected', stats.rejected],
                ['Pending ver.', stats.pendingVer],
                ['PO remaining', stats.remaining],
              ].map(([label, value]) => (
                <div key={label} className="text-center rounded-lg px-1.5 py-1.5" style={{ background: 'var(--qms-surface-strong)' }}>
                  <div className="font-bold tabular-nums" style={{ color: 'var(--qms-text)' }}>{value}</div>
                  <div style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
              Consumed value: <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{formatINR(stats.consumedValue)}</span> · Remaining: <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{formatINR(stats.remainingValue)}</span>
            </div>
          </div>
        )
      })}
      {screeningProjects.length === 0 && (
        <div className="col-span-full text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No Screening projects yet.</div>
      )}
    </div>
  )
}

export default PoManagementTab
