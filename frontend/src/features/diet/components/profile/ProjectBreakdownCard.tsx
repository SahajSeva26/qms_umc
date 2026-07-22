import { FiFolder } from 'react-icons/fi'
import type { DietitianProfileBundle } from '@/features/diet/dietitians.types'
import { fmtInr } from '@/features/diet/dietitians.service'

interface ProjectBreakdownCardProps {
  bundle: DietitianProfileBundle
}

// §8 (left) — project-wise breakdown. bundle.byProject is already computed
// in insertion order by the service layer — no re-sort here.
const ProjectBreakdownCard = ({ bundle }: ProjectBreakdownCardProps) => {
  const rows = bundle.byProject

  return (
    <div className="rounded-xl border p-3.5 h-full" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-soft)' }}>
        <FiFolder size={13} /> Project-wise breakdown
      </div>
      {rows.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: 'var(--qms-text-muted)' }}>No camps yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                <th className="text-left font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Project</th>
                <th className="text-right font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Camps</th>
                <th className="text-right font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Paid ₹</th>
                <th className="text-right font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Pending ₹</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.project.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-2.5 py-2 font-bold" style={{ color: 'var(--qms-text)' }}>{r.project.name || r.project.id}</td>
                  <td className="px-2.5 py-2 text-right" style={{ color: 'var(--qms-text)' }}>{r.camps}</td>
                  <td className="px-2.5 py-2 text-right font-semibold" style={{ color: '#047857' }}>{fmtInr(r.paidAmt)}</td>
                  <td className="px-2.5 py-2 text-right font-semibold" style={{ color: '#b91c1c' }}>{fmtInr(r.pendingAmt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ProjectBreakdownCard
