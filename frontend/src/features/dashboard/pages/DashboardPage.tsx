import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { useDashboardFilters } from '@/features/dashboard/hooks/useDashboardFilters'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { useSalesDataShared } from '@/hooks/useSalesDataShared'
import { useClientsDataShared } from '@/hooks/useClientsDataShared'
import { QUARTER } from '@/types/salesdash.types'
import { buildSalesHeadKpis, DEFAULT_SALES_FILTER, type SalesFilterState } from '@/components/widgets/sales-kpi/sales.kpis'
import SalesFilterBar from '@/components/widgets/sales-kpi/SalesFilterBar'
import SalesKpiGrid from '@/components/widgets/sales-kpi/SalesKpiGrid'
import FilterBar from '@/features/dashboard/components/FilterBar'
import TopKpiStrip from '@/features/dashboard/components/TopKpiStrip'
import CampOverviewSection from '@/features/dashboard/components/CampOverviewSection'
import CompanySection from '@/features/dashboard/components/CompanySection'
import ProjectsSection from '@/features/dashboard/components/ProjectsSection'
import FoSection from '@/features/dashboard/components/FoSection'
import SalesSection from '@/features/dashboard/components/SalesSection'
import AccountsSection from '@/features/dashboard/components/AccountsSection'
import DoctorsSection from '@/features/dashboard/components/DoctorsSection'
import PatientsSection from '@/features/dashboard/components/PatientsSection'
import SalesCommandCenter from '@/features/dashboard/components/SalesCommandCenter'
import SideDrawer from '@/components/ui/SideDrawer'
import { getGreeting } from '@/utils/formatters'

const DashboardPage = () => {
  const { user } = useAuth()
  const { hasPermission, hasAnyPermission } = usePermission()
  const { filters, setFilter, reset } = useDashboardFilters()
  const [drill, setDrill] = useState<{ title: string; content: string } | null>(null)
  const [salesFilter, setSalesFilter] = useState<SalesFilterState>(DEFAULT_SALES_FILTER)

  const isSuperAdmin = hasPermission('system:manage')
  // GET /camps/report requires this exact set — stricter than camp:search.
  const canViewCampReport = hasAnyPermission(['camp:manage', 'tenant:manage'])

  // Every section below calls useDashboardData(filters) with this same
  // object, so they all read one deduped cache entry, not separate requests.
  const { isLoading, error } = useDashboardData(filters)

  // Gated with `enabled` — these two only feed super_admin-only blocks below.
  const { reps, targets } = useSalesDataShared({ enabled: isSuperAdmin })
  const { clients, projects, invoices } = useClientsDataShared({ enabled: isSuperAdmin })
  const salesKpiTiles = useMemo(
    () => (isSuperAdmin ? buildSalesHeadKpis({ reps, targets, clients, projects, invoices, filter: salesFilter, quarter: QUARTER }) : []),
    [isSuperAdmin, reps, targets, clients, projects, invoices, salesFilter]
  )

  const onDrill = (title: string, content: string) => setDrill({ title, content })

  return (
    <div className="w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
          {getGreeting()}, {user?.firstName ?? 'there'} 👋
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          Operations · Admin Command Center
        </p>
      </div>

      <FilterBar filters={filters} setFilter={setFilter} reset={reset} />

      {isSuperAdmin && (
        <SalesFilterBar filter={salesFilter} onChange={setSalesFilter} reps={reps} clients={clients} projects={projects} />
      )}

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading dashboard…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load dashboard data. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          <TopKpiStrip filters={filters} />

          {isSuperAdmin && <SalesKpiGrid tiles={salesKpiTiles} />}

          {canViewCampReport && <CampOverviewSection />}

          <CompanySection filters={filters} onDrill={onDrill} />
          <ProjectsSection filters={filters} onDrill={onDrill} />
          <FoSection filters={filters} onDrill={onDrill} />
          <SalesSection filters={filters} onDrill={onDrill} />
          <AccountsSection filters={filters} onDrill={onDrill} />
          <DoctorsSection filters={filters} onDrill={onDrill} />
          <PatientsSection filters={filters} onDrill={onDrill} />

          {isSuperAdmin && <SalesCommandCenter />}
        </>
      )}

      <SideDrawer open={!!drill} title={drill?.title ?? ''} onClose={() => setDrill(null)}>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--qms-text-soft)' }}>
          {drill?.content}
        </p>
      </SideDrawer>
    </div>
  )
}

export default DashboardPage
