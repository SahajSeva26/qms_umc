import { effFactor, scaleKpi } from '@/features/dashboard/dashboard.mock'
import type { DashboardFilterState } from '@/features/dashboard/hooks/useDashboardFilters'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'

interface TopKpiStripProps {
  filters: DashboardFilterState
}

const TopKpiStrip = ({ filters }: TopKpiStripProps) => {
  const { data } = useDashboardData()
  const factor = effFactor(filters.dateRange, filters.client, filters.rep)

  if (!data) return null
  const { company, accounts, project, fo, sales, doctors, patients } = data

  return (
    <div className="mb-3.5">
      <h2 className="text-lg font-bold mb-0.5" style={{ color: 'var(--qms-text)' }}>Key pointers</h2>
      <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
        Headline numbers across the org · click any tile to drill
      </p>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <MiniKpiCard label="Total Billing" data={scaleKpi(company.totalBilling, factor)} />
        <MiniKpiCard label="AR Outstanding" data={scaleKpi(accounts.arOutstanding, factor)} />
        <MiniKpiCard label="EBITA" data={scaleKpi(accounts.ebita, factor)} />
        <MiniKpiCard label="Projects" data={scaleKpi(project.totalProjects, factor)} />
        <MiniKpiCard label="Active FOs" data={scaleKpi(fo.activeFOs, factor)} />
        <MiniKpiCard label="Leads" data={scaleKpi(sales.totalLeads, factor)} />
        <MiniKpiCard label="Doctors" data={scaleKpi(doctors.total, factor)} />
        <MiniKpiCard label="Patients" data={scaleKpi(patients.total, factor)} />
      </div>
    </div>
  )
}

export default TopKpiStrip
