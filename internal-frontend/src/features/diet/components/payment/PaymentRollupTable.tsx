import { FiList, FiTrendingUp, FiDollarSign, FiEdit2 } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { fmtInr } from '@/features/diet/diet.utils'
import type { ScopedDietitianRollup } from '@/features/diet/dietitians.types'

interface PaymentRollupTableProps {
  rows: ScopedDietitianRollup[]
  adminLike: boolean
  onViewCamps: (dietitianId: string) => void
  onRateTrend: (dietitianId: string) => void
  onAddPayment: (dietitianId: string) => void
  onEditBank: (dietitianId: string) => void
}

const COLUMNS = ['Dietitian', 'HQ · States', 'Total camps', 'Reports pending', 'Amt to be paid', 'Amount paid', 'Bank', 'Actions']

// Presentational only — the <table> block moved verbatim from
// DietitianPaymentPage. Receives already-filtered rows; filtering and modal
// state stay with the page.
const PaymentRollupTable = ({ rows, adminLike, onViewCamps, onRateTrend, onAddPayment, onEditBank }: PaymentRollupTableProps) => (
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
        {rows.map((r) => (
          <tr
            key={r.dietitianId}
            className="border-t border-dashed"
            style={{ borderColor: 'var(--qms-border)', background: r.toBePaid > 0 ? 'rgba(16,185,129,.04)' : undefined }}
          >
            <td className="px-2 py-2">
              <span className="font-bold" style={{ color: 'var(--qms-text)' }}>{r.dietitianName}</span>
              <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{r.dietitianId}</div>
            </td>
            <td className="px-2 py-2">
              {r.hq || '—'}
              <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{r.states.join(', ')}</div>
            </td>
            <td className="px-2 py-2">
              <span className="font-bold">{r.totalCamps}</span>
              <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{r.readyCamps} ready · {r.paidCamps} paid</div>
            </td>
            <td className="px-2 py-2 font-bold" style={{ color: r.pendingReports > 0 ? '#b91c1c' : '#475569' }}>{r.pendingReports}</td>
            <td className="px-2 py-2">
              <span className="font-bold" style={{ color: '#0d9488' }}>{fmtInr(r.toBePaid)}</span>
              {r.upcomingAmount > 0 && (
                <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>+ {fmtInr(r.upcomingAmount)} after reports</div>
              )}
            </td>
            <td className="px-2 py-2" style={{ color: '#047857' }}>{fmtInr(r.paidAmount)}</td>
            <td className="px-2 py-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={r.bankComplete ? { background: 'rgba(16,185,129,.16)', color: '#047857' } : { background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}>
                  {r.bankComplete ? 'COMPLETE' : 'MISSING'}
                </span>
                {!r.bankComplete && (
                  <button title="Add bank" onClick={() => onEditBank(r.dietitianId)} style={{ color: 'var(--qms-text-muted)' }}>
                    <FiEdit2 size={12} />
                  </button>
                )}
              </div>
            </td>
            <td className="px-2 py-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => onViewCamps(r.dietitianId)}><FiList size={11} /> View camps</Button>
                <Button size="sm" variant="outline" onClick={() => onRateTrend(r.dietitianId)}><FiTrendingUp size={11} /> Rate trend</Button>
                {adminLike && (
                  <Button size="sm" disabled={r.toBePaid === 0} onClick={() => onAddPayment(r.dietitianId)}>
                    <FiDollarSign size={11} /> Add payment
                  </Button>
                )}
              </div>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={8} className="text-center py-8" style={{ color: 'var(--qms-text-muted)' }}>No dietitians in your scope.</td></tr>
        )}
      </tbody>
    </table>
  </div>
)

export default PaymentRollupTable
