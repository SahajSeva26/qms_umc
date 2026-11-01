import { FiHome } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { formatINR } from '@/utils/formatters'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import BarListRow from '@/features/dashboard/components/BarListRow'
import EmptyLiveData from '@/features/dashboard/components/EmptyLiveData'

const CompanySection = () => {
  const { data } = useDashboardData()

  if (!data) return null
  const { company } = data

  // GET /tenants defaults to status:active; a tenant:manage caller COULD pass status=inactive to
  // see deactivated tenants too, but the Dashboard deliberately only ever requests active ones —
  // hence "Active Companies" rather than a count implying it covers every company.
  const topByBilling = [...company.breakdown].sort((a, b) => b.billing - a.billing).slice(0, 6)

  return (
    <SectionCard
      icon={FiHome}
      iconGradient="linear-gradient(135deg, var(--qms-brand), var(--qms-teal))"
      title="Company-wise"
      subtitle="Active company count in your access scope"
    >
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="Active Companies" data={company.totalCompanies} />
        <MiniKpiCard label="Total Divisions" data={company.totalDivisions} />
        <MiniKpiCard label="Total Billing" data={company.totalBilling} />
      </div>

      <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Top companies by billing
      </h3>
      {topByBilling.length === 0 ? (
        <EmptyLiveData />
      ) : (
        <div>
          {topByBilling.map((row) => (
            <BarListRow
              key={row.client}
              label={row.client}
              sublabel={`${row.divisions} div · ${row.camps} camps`}
              value={formatINR(row.billing)}
              share={(row.billing / (topByBilling[0]?.billing || 1)) * 100}
            />
          ))}
        </div>
      )}
    </SectionCard>
  )
}

export default CompanySection
