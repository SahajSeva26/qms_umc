import { FiFileText } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { formatINR } from '@/utils/formatters'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import BarListRow from '@/features/dashboard/components/BarListRow'

interface AccountsSectionProps {
  onDrill: (title: string, content: string) => void
}

const AccountsSection = ({ onDrill }: AccountsSectionProps) => {
  const { data } = useDashboardData()

  if (!data) return null
  const { accounts } = data

  return (
    <SectionCard
      icon={FiFileText}
      iconGradient="linear-gradient(135deg, #a855f7, #8b5cf6)"
      title="Accounts (P&L)"
      subtitle="Revenue · Expenses · EBITA · PAT"
      headerAction={
        <button
          onClick={() => onDrill('Accounts', 'Accounts module ships next.')}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-lg border transition-all hover:bg-(--qms-surface-hover)"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
        >
          Open Accounts
        </button>
      }
    >
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <div className="grid grid-cols-2 gap-2.5">
            <MiniKpiCard label="Revenue" data={accounts.revenue} onClick={() => onDrill('Revenue', formatINR(accounts.revenue.v))} />
            <MiniKpiCard label="Expenses" data={accounts.expenses} />
            <MiniKpiCard label="EBITA" data={accounts.ebita} />
            <MiniKpiCard label="EBITA Margin" data={accounts.ebitaMarginPct} />
            <MiniKpiCard label="PAT" data={accounts.pat} />
            <MiniKpiCard label="PAT Margin" data={accounts.patMarginPct} />
          </div>
        </div>

        <div>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <MiniKpiCard
              label="AR Outstanding"
              data={accounts.arOutstanding}
              onClick={() =>
                onDrill(
                  'AR aging',
                  `0-30d: ${formatINR(accounts.arOutstanding.v * 0.42)} · 31-60d: ${formatINR(accounts.arOutstanding.v * 0.3)} · 61-90d: ${formatINR(accounts.arOutstanding.v * 0.18)} · 90d+: ${formatINR(accounts.arOutstanding.v * 0.1)}`
                )
              }
            />
            <MiniKpiCard label="Expected · This Week" data={accounts.expectedCollection.thisWeek} />
            <MiniKpiCard label="Expected · This Month" data={accounts.expectedCollection.thisMonth} />
            <MiniKpiCard label="Payment Cycle" data={accounts.paymentCycleDays} suffix="days" />
          </div>

          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Expense split
          </h3>
          {accounts.expenseSplit.map((row) => (
            <BarListRow
              key={row.head}
              label={row.head}
              value={formatINR(row.value)}
              share={row.share}
              gradient="linear-gradient(90deg, #a855f7, #ec4899)"
              onClick={() => onDrill(row.head, `${formatINR(row.value)} · ${row.share}% of expenses`)}
            />
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

export default AccountsSection
