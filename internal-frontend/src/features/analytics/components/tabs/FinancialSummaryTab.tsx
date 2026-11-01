import { useMemo } from 'react'
import { FiFileText, FiCheckCircle, FiClock, FiList } from 'react-icons/fi'
import type { InvoiceReportResponse, InvoiceEntity, InvoiceStatus } from '@/types/invoice.types'
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_COLOR } from '@/types/invoice.types'
import { formatINR, formatINRFull, formatDate } from '@/utils/formatters'
import AnalyticsSectionCard from '@/features/analytics/components/AnalyticsSectionCard'
import FunnelChart from '@/features/analytics/components/charts/FunnelChart'
import KpiTile from '@/components/ui/KpiTile'

interface FinancialSummaryTabProps {
  report: InvoiceReportResponse
  recentInvoices: InvoiceEntity[]
}

// Every real InvoiceStatus — fills in 0/0 for any status report.statusCounts doesn't include
// (unlike the lead report, the backend here only returns statuses actually present).
const FUNNEL_STATUSES: InvoiceStatus[] = ['draft', 'approved', 'issued', 'grn_signed', 'paid', 'cancelled']
// Pre-payment stages a still-pending invoice can be in. 'cancelled' is excluded — it's a terminal
// dead end, not money still awaited, so it's shown in the breakdown but folded into neither KPI.
const NOT_YET_PAID_STATUSES: InvoiceStatus[] = ['draft', 'approved', 'issued', 'grn_signed']

// search() always populates tenant/project; the `| string` only matters for a create/update
// response's unpopulated echo, which never reaches this list-driven table.
const clientName = (invoice: InvoiceEntity) => (typeof invoice.tenant === 'string' ? invoice.tenant : invoice.tenant.name)
const projectName = (invoice: InvoiceEntity) => (typeof invoice.project === 'string' ? invoice.project : invoice.project.name)

// No P&L, expenses, EBITDA, PAT, or AR aging — no backend source for any of those in this module.
const FinancialSummaryTab = ({ report, recentInvoices }: FinancialSummaryTabProps) => {
  const statusTotals = useMemo(() => new Map(report.statusCounts.map((s) => [s.status, { count: s.count, total: s.total }])), [report.statusCounts])

  const funnelRows = useMemo(
    () =>
      FUNNEL_STATUSES.map((status) => {
        const entry = statusTotals.get(status)
        return {
          label: INVOICE_STATUS_LABEL[status],
          count: entry?.count ?? 0,
          value: entry?.total ?? 0,
          color: INVOICE_STATUS_COLOR[status],
        }
      }),
    [statusTotals],
  )

  const paidValue = statusTotals.get('paid')?.total ?? 0
  const notYetPaidValue = NOT_YET_PAID_STATUSES.reduce((sum, status) => sum + (statusTotals.get(status)?.total ?? 0), 0)

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
      <div className="col-span-full grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <KpiTile label="Total invoice value" value={formatINR(report.totalInvoiced)} sub={`selected period · ${report.totalInvoices} invoices`} tone="brand" icon={FiFileText} />
        <KpiTile label="Paid-stage value" value={formatINR(paidValue)} sub="selected period" tone="emerald" icon={FiCheckCircle} />
        <KpiTile label="Not-yet-paid-stage value" value={formatINR(notYetPaidValue)} sub="selected period · draft–GRN signed" tone="amber" icon={FiClock} />
      </div>

      <AnalyticsSectionCard
        icon={FiList}
        iconGradient="linear-gradient(135deg, var(--chart-1), var(--qms-teal))"
        title="Invoice-stage breakdown"
        subtitle={`${report.totalInvoices} invoices · selected period`}
      >
        {report.totalInvoices === 0 ? (
          <p className="text-[12px] text-center py-4" style={{ color: 'var(--qms-text-muted)' }}>
            No invoices in the selected period.
          </p>
        ) : (
          <FunnelChart rows={funnelRows} />
        )}
      </AnalyticsSectionCard>

      <div className="col-span-full">
        <AnalyticsSectionCard
          icon={FiFileText}
          iconGradient="linear-gradient(135deg, #10b981, var(--chart-2))"
          title="Recent invoices"
          subtitle="10 most recently issued invoices"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  {['Invoice', 'Client', 'Project', 'Issue date', 'Status', 'Total'].map((h) => (
                    <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{invoice.code}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{clientName(invoice)}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>{projectName(invoice)}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(invoice.issueDate)}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{INVOICE_STATUS_LABEL[invoice.status]}</td>
                    <td className="px-3 py-2 font-bold" style={{ color: 'var(--qms-text)' }}>{formatINRFull(invoice.total)}</td>
                  </tr>
                ))}
                {recentInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                      No invoices in the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AnalyticsSectionCard>
      </div>
    </div>
  )
}

export default FinancialSummaryTab
