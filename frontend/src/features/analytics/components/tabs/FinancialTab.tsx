import { useMemo } from 'react'
import { FiTrendingUp, FiPieChart, FiBarChart2, FiCreditCard } from 'react-icons/fi'
import type { ClientInvoice, InvoiceStatus } from '@/types/client.types'
import type { ArAgingBucket, PnlTrend } from '@/types/analytics.types'
import type { ExpenseRow } from '@/types/dashboard.types'
import { formatINR } from '@/utils/formatters'
import AnalyticsSectionCard from '@/features/analytics/components/AnalyticsSectionCard'
import LineChart from '@/features/analytics/components/charts/LineChart'
import Donut from '@/features/analytics/components/charts/Donut'
import BarsHorizontal from '@/features/analytics/components/charts/BarsHorizontal'

const STATUS_PILL: Record<InvoiceStatus, string> = {
  PAID: 'bg-success-soft text-success',
  OVERDUE: 'bg-danger-soft text-danger',
  SENT: '',
}

interface FinancialTabProps {
  invoices: ClientInvoice[]
  pnlTrend: PnlTrend
  expenseSplit: ExpenseRow[]
  arAging: ArAgingBucket[]
}

const FinancialTab = ({ invoices, pnlTrend, expenseSplit, arAging }: FinancialTabProps) => {
  const paid = invoices.filter((i) => i.status === 'PAID')
  const sent = invoices.filter((i) => i.status === 'SENT')
  const overdue = invoices.filter((i) => i.status === 'OVERDUE')
  const revenue = paid.reduce((sum, i) => sum + i.amount, 0)
  const outstanding = sent.reduce((sum, i) => sum + i.amount, 0)
  const overdueTotal = overdue.reduce((sum, i) => sum + i.amount, 0)

  const expenseTotal = expenseSplit.reduce((sum, e) => sum + e.value, 0)
  const expenseSlices = expenseSplit.map((e) => ({ label: e.head, value: e.value, color: e.color || 'var(--chart-1)' }))

  const arBars = arAging.map((b) => ({ label: b.range, value: b.amount, formattedValue: formatINR(b.amount) }))

  const recentInvoices = useMemo(() => invoices.slice(0, 12), [invoices])

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-3.5">
        {[
          { label: 'Revenue', value: revenue, color: '#059669', sub: `${paid.length} paid invoices` },
          { label: 'Outstanding', value: outstanding, color: 'var(--qms-brand)', sub: `${sent.length} pending` },
          { label: 'Overdue', value: overdueTotal, color: 'var(--danger)', sub: `${overdue.length} overdue` },
        ].map((tile) => (
          <div key={tile.label} className="rounded-2xl border p-4 text-center" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="text-[22px] font-extrabold" style={{ color: tile.color }}>{formatINR(tile.value)}</div>
            <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>{tile.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        <div className="md:col-span-2">
          <AnalyticsSectionCard icon={FiTrendingUp} iconGradient="linear-gradient(135deg, var(--chart-1), var(--chart-2))" title="P&L trend · 12 weeks" subtitle="Not filtered by period selector">
            <LineChart
              series={[
                { label: 'Revenue', color: '#10b981', data: pnlTrend.revenue.map((p) => p.amount) },
                { label: 'Expense', color: '#f43f5e', data: pnlTrend.expense.map((p) => p.amount) },
              ]}
              labels={pnlTrend.revenue.map((p) => p.week)}
              formatY={formatINR}
            />
          </AnalyticsSectionCard>
        </div>

        <AnalyticsSectionCard icon={FiPieChart} iconGradient="linear-gradient(135deg, var(--chart-3), #a855f7)" title="Expense breakdown" subtitle={formatINR(expenseTotal)}>
          <Donut slices={expenseSlices} centerLabel={formatINR(expenseTotal)} centerSub="total" />
        </AnalyticsSectionCard>

        <AnalyticsSectionCard icon={FiBarChart2} iconGradient="linear-gradient(135deg, #f59e0b, #f43f5e)" title="AR aging" subtitle="Outstanding by bucket">
          <BarsHorizontal bars={arBars} gradient="linear-gradient(90deg, #f59e0b, #f43f5e)" />
        </AnalyticsSectionCard>

        <div className="md:col-span-2">
          <AnalyticsSectionCard icon={FiCreditCard} iconGradient="linear-gradient(135deg, #10b981, var(--chart-2))" title="Recent invoices" subtitle={`${recentInvoices.length} shown`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    {['ID', 'Client', 'Project', 'Amount', 'Due', 'Age', 'Status'].map((h) => (
                      <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>{inv.id}</td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>{inv.clientName}</td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{inv.project}</td>
                      <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>{formatINR(inv.amount)}</td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{inv.due}</td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{inv.age}d</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_PILL[inv.status]}`}>{inv.status}</span>
                      </td>
                    </tr>
                  ))}
                  {recentInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                        No invoices in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </AnalyticsSectionCard>
        </div>
      </div>
    </div>
  )
}

export default FinancialTab
