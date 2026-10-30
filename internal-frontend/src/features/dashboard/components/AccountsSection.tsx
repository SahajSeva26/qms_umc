import { FiFileText } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import BarListRow from '@/features/dashboard/components/BarListRow'
import EmptyLiveData from '@/features/dashboard/components/EmptyLiveData'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  approved: 'Approved',
  issued: 'Issued',
  grn_signed: 'GRN Signed',
  paid: 'Paid',
  cancelled: 'Cancelled',
}

const AccountsSection = () => {
  const { data } = useDashboardData()

  if (!data) return null
  const { accounts } = data

  const maxStatusCount = Math.max(...accounts.invoiceStatusMix.map((s) => s.count), 1)

  return (
    <SectionCard
      icon={FiFileText}
      iconGradient="linear-gradient(135deg, #a855f7, #8b5cf6)"
      title="Accounts"
      subtitle="Invoice totals — no real P&L (revenue/expense) aggregation exists yet"
    >
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="Total Invoices" data={accounts.totalInvoices} />
        <MiniKpiCard label="Total Invoiced Amount" data={accounts.totalInvoicedAmount} />
        <MiniKpiCard label="Revenue" data={accounts.revenue} />
        <MiniKpiCard label="AR Outstanding" data={accounts.arOutstanding} />
        <MiniKpiCard label="Expenses" data={accounts.expenses} />
        <MiniKpiCard label="EBITA" data={accounts.ebita} />
        <MiniKpiCard label="PAT" data={accounts.pat} />
      </div>

      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Invoice status mix
      </h3>
      {accounts.invoiceStatusMix.length === 0 ? (
        <EmptyLiveData />
      ) : (
        accounts.invoiceStatusMix.map((row) => (
          <BarListRow
            key={row.status}
            label={STATUS_LABEL[row.status] ?? row.status}
            value={String(row.count)}
            share={(row.count / maxStatusCount) * 100}
            gradient="linear-gradient(90deg, #a855f7, #8b5cf6)"
          />
        ))
      )}

      <h3 className="text-[12px] font-bold uppercase tracking-wider mt-5 mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Expense split
      </h3>
      <EmptyLiveData />
    </SectionCard>
  )
}

export default AccountsSection
