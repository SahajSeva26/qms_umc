import { FiTrendingUp } from 'react-icons/fi'
import type { DietitianProfileBundle } from '@/features/diet/dietitians.types'
import { fmtDate } from './profile.utils'

interface RateTrendSectionProps {
  bundle: DietitianProfileBundle
}

// §7 — Rate trend. Plain read-only table (NOT a chart, NOT an editing
// modal) — bundle.rateHistory is already newest-first.
const RateTrendSection = ({ bundle }: RateTrendSectionProps) => {
  const rows = bundle.rateHistory.slice(0, 15)

  return (
    <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-soft)' }}>
        <FiTrendingUp size={13} /> Rate trend
      </div>
      {rows.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: 'var(--qms-text-muted)' }}>No rate changes recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['When', 'By', 'Rem ₹', 'TA ₹', 'Print ₹', 'Target ₹', 'Total ₹', 'Reason'].map((h) => (
                  <th key={h} className="text-left font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const total = (r.remuneration || 0) + (r.ta || 0) + (r.printing || 0)
                return (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-2.5 py-2" style={{ color: 'var(--qms-text)' }}>{fmtDate(r.setAt)}</td>
                    <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{r.setBy || '—'}</td>
                    <td className="px-2.5 py-2" style={{ color: 'var(--qms-text)' }}>{(r.remuneration || 0).toLocaleString('en-IN')}</td>
                    <td className="px-2.5 py-2" style={{ color: 'var(--qms-text)' }}>{(r.ta || 0).toLocaleString('en-IN')}</td>
                    <td className="px-2.5 py-2" style={{ color: 'var(--qms-text)' }}>{(r.printing || 0).toLocaleString('en-IN')}</td>
                    <td className="px-2.5 py-2" style={{ color: 'var(--qms-text)' }}>{(r.targetCost || 0).toLocaleString('en-IN')}</td>
                    <td className="px-2.5 py-2 font-extrabold" style={{ color: '#0d9488' }}>{total.toLocaleString('en-IN')}</td>
                    <td className="px-2.5 py-2 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{r.reason || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default RateTrendSection
