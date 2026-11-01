import { FiDownload } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { fmtInr } from '@/features/diet/diet.utils'
import type { DietPayment } from '@/features/diet/dietitians.types'

interface PaymentLedgerTableProps {
  /** Full sorted ledger — used for the count and the export. */
  payments: DietPayment[]
  /** The slice actually rendered (last 25). */
  recentPayments: DietPayment[]
  onExport: () => void
}

const COLUMNS = ['Date', 'Dietitian', 'Camps', 'Mode', 'Reference', 'Amount ₹', 'By']

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN')
}

// The "Recent payments" card, moved verbatim from DietitianPaymentPage.
const PaymentLedgerTable = ({ payments, recentPayments, onExport }: PaymentLedgerTableProps) => (
  <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
    <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
      <div>
        <div className="text-[14px] font-extrabold" style={{ color: 'var(--qms-text)' }}>Recent payments ({payments.length})</div>
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Last 25 payouts recorded. Newest first.</div>
      </div>
      <Button size="sm" variant="outline" onClick={onExport}><FiDownload size={12} /> Export ledger</Button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr style={{ background: 'var(--qms-surface-strong)' }}>
            {COLUMNS.map((h) => (
              <th key={h} className="text-left font-bold px-2 py-2 text-[10px] uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recentPayments.map((p) => (
            <tr key={p.id} className="border-t border-dashed" style={{ borderColor: 'var(--qms-border)' }}>
              <td className="px-2 py-2">{fmtDate(p.paidOn)}</td>
              <td className="px-2 py-2 font-bold" style={{ color: 'var(--qms-text)' }}>{p.dietitianName}</td>
              <td className="px-2 py-2">{p.campIds.length ? p.campIds.join(', ') : '—'}</td>
              <td className="px-2 py-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,109,255,.14)', color: '#1d4ed8' }}>{p.mode}</span>
              </td>
              <td className="px-2 py-2">{p.ref || '—'}</td>
              <td className="px-2 py-2 font-bold" style={{ color: '#047857' }}>{fmtInr(p.amount)}</td>
              <td className="px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>{p.paidBy}</td>
            </tr>
          ))}
          {recentPayments.length === 0 && (
            <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--qms-text-muted)' }}>No payments recorded yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)

export default PaymentLedgerTable
