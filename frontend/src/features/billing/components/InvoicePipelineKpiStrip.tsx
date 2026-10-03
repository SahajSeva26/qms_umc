import type { InvoiceReportResponse } from '@/types/invoice.types'
import { formatINRFull } from '@/utils/formatters'

interface InvoicePipelineKpiStripProps {
  report: InvoiceReportResponse | null | undefined
  isLoading: boolean
  error: unknown
}

// Sourced from GET /invoices/report (tenant-wide, unaffected by list pagination). No paymentStatus
// field on Invoice, so "outstanding/cleared" is derived from status alone.
const InvoicePipelineKpiStrip = ({ report, isLoading, error }: InvoicePipelineKpiStripProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-3 h-16 animate-pulse" style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }} />
        ))}
      </div>
    )
  }

  if (error || !report) {
    return (
      <p className="text-[13px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
        Couldn't load pipeline totals.
      </p>
    )
  }

  const byStatus = new Map(report.statusCounts.map((s) => [s.status, s]))
  const pendingApproval = byStatus.get('draft')?.count ?? 0
  const outstanding = report.statusCounts
    .filter((s) => s.status !== 'paid' && s.status !== 'cancelled')
    .reduce((sum, s) => sum + s.total, 0)
  const cleared = byStatus.get('paid')?.total ?? 0

  const tiles = [
    { label: 'Total invoiced', value: formatINRFull(report.totalInvoiced), sub: `${report.totalInvoices} invoice${report.totalInvoices === 1 ? '' : 's'}`, color: 'var(--qms-text)' },
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
