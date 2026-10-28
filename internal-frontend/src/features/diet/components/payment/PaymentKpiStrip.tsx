import { FiList, FiFileText, FiCheckSquare, FiFileMinus } from 'react-icons/fi'
import KpiTile from '@/components/ui/KpiTile'
import { fmtInr } from '@/features/diet/diet.utils'

interface PaymentKpiStripProps {
  dietitianCount: number
  kpi: {
    reportsPending: number
    released: number
    ready: number
    upcoming: number
    missingBank: number
  }
}

// Markup moved verbatim from DietitianPaymentPage. The two middle tiles are
// hand-rolled (not KpiTile) in the original because they use bespoke value
// colours — kept exactly as-is rather than normalised onto KpiTile, which
// would change their appearance.
const PaymentKpiStrip = ({ dietitianCount, kpi }: PaymentKpiStripProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 mb-4">
    <KpiTile label="Dietitians" value={String(dietitianCount)} sub="In your scope" tone="brand" icon={FiList} />
    <KpiTile label="Reports pending" value={String(kpi.reportsPending)} sub="Camps awaiting patient count + photos" tone="amber" icon={FiFileText} />
    <KpiTile label="Payment released" value={fmtInr(kpi.released)} sub="Across all ledger entries" tone="emerald" icon={FiCheckSquare} />
    <div className="relative rounded-xl border p-3.5 overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Ready for payment</div>
      <div className="text-[22px] font-extrabold leading-tight mb-0.5" style={{ color: '#0d9488' }}>{fmtInr(kpi.ready)}</div>
      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Reports complete · not yet paid</div>
    </div>
    <div className="relative rounded-xl border p-3.5 overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Estimated upcoming</div>
      <div className="text-[22px] font-extrabold leading-tight mb-0.5" style={{ color: '#92400e' }}>{fmtInr(kpi.upcoming)}</div>
      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>After report completion</div>
    </div>
    <KpiTile label="Missing bank" value={String(kpi.missingBank)} sub="Blocks payout" tone="rose" icon={FiFileMinus} />
  </div>
)

export default PaymentKpiStrip
