import { FiCreditCard } from 'react-icons/fi'
import type { DietitianProfileBundle } from '@/features/diet/dietitians.types'
import { fmtInr } from '@/features/diet/dietitians.service'
import { fmtDate } from './profile.utils'

interface PaymentLedgerSectionProps {
  bundle: DietitianProfileBundle
}

// §10 — Payment ledger. The store's own order isn't guaranteed sorted, so
// (a disclosed, reasonable improvement over the prototype) we sort by
// paidAt desc here for a deterministic newest-first display.
const PaymentLedgerSection = ({ bundle }: PaymentLedgerSectionProps) => {
  const rows = [...bundle.payments].sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || '')).slice(0, 15)

  return (
    <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-soft)' }}>
        <FiCreditCard size={13} /> Payment ledger
      </div>
      {rows.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: 'var(--qms-text-muted)' }}>No payments recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['When', 'Mode', 'Reference', 'Camps', 'Amount ₹', 'By'].map((h) => (
                  <th key={h} className="text-left font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text)' }}>{fmtDate(p.paidOn)}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{p.mode || 'BANK'}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{p.ref}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{p.campIds?.length ? p.campIds.join(', ') : '—'}</td>
                  <td className="px-2.5 py-2 text-right font-bold" style={{ color: '#047857' }}>{fmtInr(p.amount)}</td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{p.paidBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default PaymentLedgerSection
