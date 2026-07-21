import { FiCalendar } from 'react-icons/fi'
import type { DietitianProfileBundle } from '@/features/diet/dietitians.types'
import { PROJECTS } from '@/features/crm/clients/clients.mock'
import { dietitianExpense, campPaymentStatus } from '@/features/diet/dietitians.service'
import { fmtDate } from './profile.utils'

interface CampHistorySectionProps {
  bundle: DietitianProfileBundle
}

const PAYMENT_PILL: Record<string, { bg: string; color: string }> = {
  PAID:    { bg: 'rgba(16,185,129,.16)', color: '#047857' },
  READY:   { bg: 'rgba(245,158,11,.16)', color: '#92400e' },
  PENDING: { bg: 'rgba(244,63,94,.16)',  color: '#b91c1c' },
}

// §9 — Camp history, full width. bundle.camps sorted date desc, sliced 25.
const CampHistorySection = ({ bundle }: CampHistorySectionProps) => {
  const sorted = [...bundle.camps].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const rows = sorted.slice(0, 25)

  return (
    <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-soft)' }}>
        <FiCalendar size={13} /> Camp history
      </div>
      {rows.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: 'var(--qms-text-muted)' }}>No camps.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: 'var(--qms-surface-strong)' }}>
                  {['Camp', 'Project', 'City', 'Total ₹', 'Status', 'Payment'].map((h) => (
                    <th key={h} className="text-left font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const proj = PROJECTS.find((p) => p.id === c.projectId)
                  const total = dietitianExpense(c).total
                  const status = campPaymentStatus(c)
                  const pill = status ? PAYMENT_PILL[status] : null
                  return (
                    <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                      <td className="px-2.5 py-2" style={{ color: 'var(--qms-text)' }}>
                        <div className="font-bold">{c.id}</div>
                        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{fmtDate(c.date)}</div>
                      </td>
                      <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{proj?.name || c.projectId || '—'}</td>
                      <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{c.city || '—'}</td>
                      <td className="px-2.5 py-2 text-right font-bold" style={{ color: 'var(--qms-text)' }}>{total.toLocaleString('en-IN')}</td>
                      <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{c.status || '—'}</td>
                      <td className="px-2.5 py-2">
                        {pill ? (
                          <span className="inline-flex items-center text-[10.5px] font-extrabold rounded-full px-2 py-0.5" style={{ background: pill.bg, color: pill.color }}>
                            {status}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {bundle.camps.length > 25 && (
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>+{bundle.camps.length - 25} more</p>
          )}
        </>
      )}
    </div>
  )
}

export default CampHistorySection
