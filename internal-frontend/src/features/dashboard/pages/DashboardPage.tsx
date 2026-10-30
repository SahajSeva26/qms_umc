import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { useCampReport } from '@/features/camps/hooks/useCampReport'
import { screeningService } from '@/features/clinical/screening/screening.service'
import { buildDashboardSalesKpis } from '@/features/dashboard/dashboard.salesKpis'
import SalesFilterBar from '@/components/widgets/sales-kpi/SalesFilterBar'
import SalesKpiGrid from '@/components/widgets/sales-kpi/SalesKpiGrid'
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
import PipelinePulseSection from '@/features/dashboard/components/PipelinePulseSection'
import { getGreeting } from '@/utils/formatters'

// closed + cancelled_charged — the "done" convention used elsewhere (e.g. project's executedCamps).
const EXECUTED_CAMP_STATUSES = new Set(['closed', 'cancelled_charged'])

const DashboardPage = () => {
  const { user } = useAuth()
  const { hasPermission, hasAnyPermission } = usePermission()

  const isSuperAdmin = hasPermission('system:manage')
  // GET /camps/report requires this exact set — stricter than camp:search.
  const canViewCampReport = hasAnyPermission(['camp:manage', 'tenant:manage'])
  // screening:search alone own-scopes results server-side — only screening:manage gives a true total.
  const canViewScreeningTotal = hasPermission('screening:manage')

  const { data, isLoading, error } = useDashboardData()

  const { data: campReportRes } = useCampReport(isSuperAdmin && canViewCampReport)
  const campsConducted = campReportRes?.data?.byStatus
    .filter((s) => EXECUTED_CAMP_STATUSES.has(s.status))
    .reduce((sum, s) => sum + s.count, 0) ?? null

  const { data: screeningCountRes } = useQuery({
    queryKey: ['screenings', 'count', 'org-total'],
    queryFn: () => screeningService.searchScreenings({ limit: '1' }),
    enabled: isSuperAdmin && canViewScreeningTotal,
    staleTime: 60_000,
  })
  const totalScreenings = screeningCountRes?.data?.count ?? null

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

      {isSuperAdmin && <SalesFilterBar />}

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
          {data?.hasLoadError && (
            <div className="text-[12px] rounded-xl px-3 py-2 mb-3.5 bg-warning-soft border border-warning text-warning">
              Some live metrics could not be loaded.
            </div>
          )}

          <TopKpiStrip />

          {isSuperAdmin && (
            <SalesKpiGrid
              tiles={buildDashboardSalesKpis(
                {
                  campsConducted,
                  totalScreenings,
                  totalProjects: data?.project.totalProjects.v ?? null,
                  screeningProjects: data?.project.screeningProjects.v ?? null,
                  dietProjects: data?.project.dietProjects.v ?? null,
                  labProjects: data?.project.labProjects.v ?? null,
                },
                {
                  pipelineValue: data?.sales.pipelineValue.v ?? null,
                  leadWinRate: data?.sales.leadWinRate.v ?? null,
                },
              )}
            />
          )}

          <CampReportSection />

          <CompanySection />
          <ProjectsSection />
          <FoSection />
          <SalesSection />
          <AccountsSection />
          <DoctorsSection />
          <PatientsSection />

          {isSuperAdmin && <PipelinePulseSection />}
          {isSuperAdmin && <SalesCommandCenter />}
        </>
      )}
    </div>
  )
}

export default DashboardPage
