import { FiAlertTriangle } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import { useProjectsDataShared } from '@/hooks/useProjectsDataShared'
import { useErp } from '@/features/om/hooks/useErp'
import { leakage } from '@/features/om/erp.service'
import KpiTile from '@/components/ui/KpiTile'
import { FiDollarSign, FiTrendingUp, FiXOctagon } from 'react-icons/fi'
import { clientName } from '@/types/campref.types'
import { formatINR } from '@/utils/formatters'

interface RevenueAssuranceTabProps {
  camps: Camp[]
}

// Mirrors leakage() exactly (erp-screening.js:147-173) — categorizes
// completed-but-not-billed camp value by verification-status root cause.
const RevenueAssuranceTab = ({ camps }: RevenueAssuranceTabProps) => {
  const { projects } = useProjectsDataShared()
  const erp = useErp()
  const result = leakage(camps, projects, erp.verification, erp.billedCampIds)
  const technicalCategory = result.categories.find((c) => c.key === 'TECHNICAL')

  return (
    <div>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <KpiTile label="Total revenue leakage" value={formatINR(result.total)} tone="rose" icon={FiDollarSign} />
        <KpiTile label="Recovery potential" value={formatINR(result.recoverable)} tone="emerald" icon={FiTrendingUp} />
        <KpiTile label="Unrecoverable" value={formatINR(result.unrecoverable)} tone="rose" icon={FiXOctagon} />
      </div>

      {technicalCategory && technicalCategory.amount > 0 && (
        <div className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-lg mb-4" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          <FiAlertTriangle size={13} /> {formatINR(technicalCategory.amount)} blocked by technical issues — recoverable on reinstatement
        </div>
      )}

      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {result.categories.map((cat) => (
          <div key={cat.key} className="rounded-xl border p-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>{cat.label}</div>
            <div className="text-[16px] font-extrabold tabular-nums" style={{ color: 'var(--qms-text)' }}>{formatINR(cat.amount)}</div>
            <div className="text-[10px]" style={{ color: cat.recoverable ? 'var(--success)' : 'var(--danger)' }}>{cat.count} camps · {cat.recoverable ? 'recoverable' : 'at-risk'}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: 'var(--qms-surface-strong)' }}>
              {['Camp', 'Client', 'Cause', 'Detail', 'Revenue'].map((h) => (
                <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.campId} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{row.campId}</td>
                <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{clientName(row.clientId)}</td>
                <td className="px-3 py-2.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>{row.category}</span>
                </td>
                <td className="px-3 py-2.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{row.reason || '—'}</td>
                <td className="px-3 py-2.5 font-bold tabular-nums" style={{ color: 'var(--qms-text)' }}>{formatINR(row.amount)}</td>
              </tr>
            ))}
            {result.rows.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No revenue leakage detected.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RevenueAssuranceTab
