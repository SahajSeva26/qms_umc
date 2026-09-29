import type { InvoiceEntity } from '@/types/invoice.types'
import { formatINRFull } from '@/utils/formatters'

interface InvoicePipelineKpiStripProps {
  invoices: InvoiceEntity[]
  totalCount: number
}

// Matches the prototype's 4-tile pipeline summary (crm-invoicing.js:430-435),
// but computed from real fields only — no paymentStatus concept exists on
// our Invoice model, so "outstanding/cleared" is honestly re-derived from
// the real status enum: paid = cleared, everything else non-cancelled = outstanding.
const InvoicePipelineKpiStrip = ({ invoices, totalCount }: InvoicePipelineKpiStripProps) => {
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0)
  const pendingApproval = invoices.filter((inv) => inv.status === 'draft').length
  const outstanding = invoices.filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled').reduce((sum, inv) => sum + inv.total, 0)
  const cleared = invoices.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0)

  const tiles = [
    { label: 'Total invoiced', value: formatINRFull(totalInvoiced), sub: `${totalCount} invoice${totalCount === 1 ? '' : 's'}`, color: 'var(--qms-text)' },
    { label: 'Pending approval', value: String(pendingApproval), sub: 'draft invoices', color: '#0ea5e9' },
    { label: 'Payment outstanding', value: formatINRFull(outstanding), sub: undefined, color: '#f43f5e' },
    { label: 'Payment cleared', value: formatINRFull(cleared), sub: undefined, color: '#10b981' },
  ]

  return (
    <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{tile.label}</div>
          <div className="text-xl font-extrabold mt-0.5" style={{ color: tile.color }}>{tile.value}</div>
          {tile.sub && <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{tile.sub}</div>}
        </div>
      ))}
    </div>
  )
}

export default InvoicePipelineKpiStrip
