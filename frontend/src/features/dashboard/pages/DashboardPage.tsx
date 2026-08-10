import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { useDashboardFilters } from '@/features/dashboard/hooks/useDashboardFilters'
import { useSalesDataShared } from '@/hooks/useSalesDataShared'
import { useClientsDataShared } from '@/hooks/useClientsDataShared'
import { QUARTER } from '@/types/salesdash.types'
import { buildSalesHeadKpis, DEFAULT_SALES_FILTER, type SalesFilterState } from '@/components/widgets/sales-kpi/sales.kpis'
import SalesFilterBar from '@/components/widgets/sales-kpi/SalesFilterBar'
import SalesKpiGrid from '@/components/widgets/sales-kpi/SalesKpiGrid'
import FilterBar from '@/features/dashboard/components/FilterBar'
import TopKpiStrip from '@/features/dashboard/components/TopKpiStrip'
import CampReportSection from '@/features/dashboard/components/CampReportSection'
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
  const { hasPermission } = usePermission()
  const { filters, setFilter, reset } = useDashboardFilters()
  const [drill, setDrill] = useState<{ title: string; content: string } | null>(null)
  const [salesFilter, setSalesFilter] = useState<SalesFilterState>(DEFAULT_SALES_FILTER)

  // The prototype's dashboard.html merges the Sales Command Center's filter
  // bar + KPI strip directly into this page, super_admin-only (dashboard.js:
  // "isSuper = sess.roleId === 'super_admin'"). The placeholder UserRole
  // system that used to gate this (user?.role === 'super_admin') never
  // actually worked — every real login was hardcoded to that same string
  // regardless of who was logged in, so this block has always rendered for
  // everyone in practice. Real replacement: system:manage, the actual
  // backend permission that denotes full administrative access.
  const isSuperAdmin = hasPermission('system:manage')
  const { reps, targets } = useSalesDataShared()
  const { clients, projects, invoices } = useClientsDataShared()
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

      <TopKpiStrip filters={filters} />

      {isSuperAdmin && <SalesKpiGrid tiles={salesKpiTiles} />}

      <CampReportSection />

      <CompanySection onDrill={onDrill} />
      <ProjectsSection onDrill={onDrill} />
      <FoSection onDrill={onDrill} />
      <SalesSection onDrill={onDrill} />
      <AccountsSection onDrill={onDrill} />
      <DoctorsSection onDrill={onDrill} />
      <PatientsSection onDrill={onDrill} />

      {isSuperAdmin && <SalesCommandCenter />}

      <SideDrawer open={!!drill} title={drill?.title ?? ''} onClose={() => setDrill(null)}>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--qms-text-soft)' }}>
          {drill?.content}
        </p>
      </SideDrawer>
    </div>
  )
}

export default DashboardPage
