import { useState } from 'react'
import { FiHome, FiEye } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { formatINR } from '@/utils/formatters'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import BarListRow from '@/features/dashboard/components/BarListRow'
import FilterChips from '@/features/dashboard/components/FilterChips'

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'TRIAL', 'PAUSED', 'INACTIVE']

interface CompanySectionProps {
  onDrill: (title: string, content: string) => void
}

const CompanySection = ({ onDrill }: CompanySectionProps) => {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const { data } = useDashboardData()

  if (!data) return null
  const { company } = data

  const rows = statusFilter === 'ALL' ? company.breakdown : company.breakdown.filter((r) => r.status === statusFilter)
  const topByBilling = [...rows].sort((a, b) => b.billing - a.billing).slice(0, 6)

  return (
    <SectionCard
      icon={FiHome}
      iconGradient="linear-gradient(135deg, var(--qms-brand), var(--qms-teal))"
      title="Company-wise"
      subtitle={`${rows.length} of ${company.breakdown.length} companies in this filter`}
      headerAction={
        <button
          onClick={() => onDrill('All companies', `${company.breakdown.length} companies total`)}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-lg border transition-all hover:bg-(--qms-surface-hover)"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
        >
          <FiEye size={13} /> View all
        </button>
      }
    >
      <FilterChips options={STATUS_FILTERS} active={statusFilter} onChange={setStatusFilter} />

      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="Total Companies" data={company.totalCompanies} />
        <MiniKpiCard label="Total Divisions" data={company.totalDivisions} />
        <MiniKpiCard label="Account Penetration" data={company.accountPenetration} />
        <MiniKpiCard label="Total Billing" data={company.totalBilling} />
        <MiniKpiCard label="Outstanding" data={company.outstanding} />
      </div>

      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Top companies by billing
      </h3>
      <div>
        {topByBilling.map((row) => (
          <BarListRow
            key={row.client}
            label={row.client}
            sublabel={`${row.divisions} div · ${row.camps} camps`}
            value={formatINR(row.billing)}
            share={(row.billing / (topByBilling[0]?.billing || 1)) * 100}
            onClick={() =>
              onDrill(row.client, `${row.projects} projects · ${formatINR(row.billing)} billed · ${formatINR(row.outstanding)} outstanding · ${row.status}`)
            }
          />
        ))}
      </div>
    </SectionCard>
  )
}

export default CompanySection
