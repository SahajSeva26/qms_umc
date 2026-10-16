import { useMemo, useState } from 'react'
import { FiBriefcase, FiLayers, FiPieChart, FiCreditCard } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import { useLeads } from '@/features/crm/hooks/useLeads'
import { useLeadReport } from '@/features/crm/hooks/useLeadReport'
import { useMySalesSweep } from '@/features/crm/hooks/useMySalesSweep'
import { useSalesDashboardAppointmentSweep } from '@/features/crm/salesDashboard/hooks/useSalesDashboardAppointmentSweep'
import { useProjectsDataShared } from '@/hooks/useProjectsDataShared'
import {
  buildRevenueTiles, buildPipelineTiles, buildMyRevenueTiles, buildMyPipelineTiles,
  buildProjectTiles, buildAiCopilotMessage,
} from '@/features/crm/salesDashboard/salesDashboard.kpis'
import { buildLeaderboard } from '@/features/crm/salesDashboard/salesDashboard.performance'
import { buildCompanyDivisionRows, buildProjectTypeBillingRows } from '@/features/crm/salesDashboard/salesDashboard.today'
import { computeMyKpis } from '@/features/crm/crm.myKpis'
import AiCopilotBanner from '@/features/crm/salesDashboard/components/AiCopilotBanner'
import SalesDashboardChips from '@/features/crm/salesDashboard/components/SalesDashboardChips'
import SalesDashboardTabs, { type SalesDashboardTab } from '@/features/crm/salesDashboard/components/SalesDashboardTabs'
import TodayTab from '@/features/crm/salesDashboard/components/TodayTab'
import PerformanceTab from '@/features/crm/salesDashboard/components/PerformanceTab'
import ActivityTab from '@/features/crm/salesDashboard/components/ActivityTab'
import SalesDashboardKpiCategoryGroup from '@/features/crm/salesDashboard/components/SalesDashboardKpiCategoryGroup'
import SalesDashboardKpiTile from '@/features/crm/salesDashboard/components/SalesDashboardKpiTile'
import LeadDrawer from '@/features/crm/components/LeadDrawer'
import type { LeadEntity } from '@/types/crm.types'

// Shared by Sales Head (lead:manage) and Key Account Manager (lead:search, own-scoped) — one page,
// content adapts by permission, matching the prototype's single sales.html serving both roles.
// Team/Targets & Assignments/Approvals/Meeting→PO Journey are deliberately not built — confirmed no
// real backend concept exists for any of them (no Target/Quota module, no supervisor tree for
// platform sales staff, no ApprovalRequest model, no unified meeting→PO entity). See crm.myKpis.ts
// and salesDashboard.kpis.ts for the full real-vs-dropped tile breakdown.
const SalesDashboardPage = () => {
  const { hasAnyPermission } = usePermission()
  // /leads/report is lead:manage-gated at the route level (see CrmPage's identical split) — a
  // tenant:manage-only caller must still fall into the own-scope KPI/leaderboard path.
  const canViewTeamReport = hasAnyPermission(['lead:manage'])
  // Separate from canViewTeamReport: tenant:manage is a real, backend-authorized way to mutate
  // leads (create/update/move-stage) even without lead:manage itself — mirrors CrmPage's
  // canManageLeads. Gating LeadDrawer's actions on canViewTeamReport would silently disable
  // actions a tenant:manage caller is actually allowed to perform.
  const canManageLeadMutations = hasAnyPermission(['lead:manage', 'tenant:manage'])
  const [tab, setTab] = useState<SalesDashboardTab>('today')
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)

  const { report, isLoading: reportLoading, error: reportError, refetch: refetchReport } = useLeadReport({}, canViewTeamReport)
  // useMySalesSweep is own-scope-agnostic: applyOwnScope on the backend auto-pins a lead:search-only
  // caller (KAM) to their own leads, and leaves a lead:manage caller (Sales Head) unscoped — same
  // hook, same endpoint, different real result per role, no client-side role branching needed here.
  const sweep = useMySalesSweep(true)
  const leads: LeadEntity[] = useMemo(() => sweep.data ?? [], [sweep.data])

  const { projects, isLoading: projectsLoading, error: projectsErrorObj } = useProjectsDataShared()
  const projectsIsError = !!projectsErrorObj
  const { moveStage, updateLead } = useLeads({}, false)
  // Appointments are only ever rendered for a lead:manage caller (Performance's Meetings/Follow-ups
  // columns and Activity's heatmap are both Sales-Head-only — see PerformanceTab/ActivityTab); a
  // KAM viewing either tab would otherwise fire a full sweep whose data it never displays.
  const appointmentSweep = useSalesDashboardAppointmentSweep(canViewTeamReport && (tab === 'activity' || tab === 'performance'))
  const appointments = useMemo(() => appointmentSweep.data ?? [], [appointmentSweep.data])

  const revenueTiles = useMemo(() => {
    if (canViewTeamReport) return report ? buildRevenueTiles(report) : []
    return sweep.data ? buildMyRevenueTiles(sweep.data) : []
  }, [canViewTeamReport, report, sweep.data])

  const pipelineTiles = useMemo(() => {
    if (canViewTeamReport) return report ? buildPipelineTiles(report) : []
    return sweep.data ? buildMyPipelineTiles(sweep.data) : []
  }, [canViewTeamReport, report, sweep.data])

  const projectTiles = useMemo(() => buildProjectTiles(projects), [projects])
  const companyRows = useMemo(() => buildCompanyDivisionRows(projects), [projects])
  const projectTypeBillingRows = useMemo(() => buildProjectTypeBillingRows(projects), [projects])

  const leaderboard = useMemo(() => (canViewTeamReport ? buildLeaderboard(leads, appointments) : []), [canViewTeamReport, leads, appointments])

  const myKpis = useMemo(() => (sweep.data && !canViewTeamReport ? computeMyKpis(sweep.data) : []), [sweep.data, canViewTeamReport])
  const winRate = canViewTeamReport ? (report?.kpis.winRate ?? 0) : Number(myKpis.find((k) => k.id === 'wr')?.value ?? 0)
  const pipelineValue = canViewTeamReport ? (report?.kpis.pipelineValue ?? 0) : Number(myKpis.find((k) => k.id === 'openValue')?.value ?? 0)

  const isLoadingKpis = canViewTeamReport ? reportLoading : sweep.isLoading
  const kpiError = canViewTeamReport ? reportError : sweep.isError
  const refetchKpis = canViewTeamReport ? refetchReport : sweep.refetch

  const openLead = leads.find((l) => l.id === openLeadId) ?? null

  return (
    <div className="w-full">
      <div className="mb-3">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Sales Dashboard</h1>
        <p className="text-[13px] mt-1 mb-3" style={{ color: 'var(--qms-text-muted)' }}>Sales · Dashboard</p>
        <SalesDashboardChips accountsCount={null} />
      </div>

      {!isLoadingKpis && !kpiError && (
        <AiCopilotBanner message={buildAiCopilotMessage(winRate, pipelineValue)} />
      )}

      {isLoadingKpis && (
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border h-20 animate-pulse" style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }} />
          ))}
        </div>
      )}

      {!isLoadingKpis && kpiError && (
        <div className="flex items-center gap-3 text-[13px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
          <span>Couldn't load your dashboard.</span>
          <button
            type="button"
            onClick={() => refetchKpis()}
            className="rounded-lg border px-3 py-1.5 font-medium"
            style={{ borderColor: 'var(--qms-border-strong)', color: 'var(--qms-text)' }}
          >
            Retry
          </button>
        </div>
      )}

      {!isLoadingKpis && !kpiError && (
        <>
          {/* Renamed from the prototype's "Revenue & Profitability" — these tiles are lead
              estimatedValue/pipeline figures (pipeline value, won value, avg deal, win rate,
              velocity), never invoiced/paid revenue, gross margin, or EBITDA. The prototype's own
              Revenue/Profitability cards (YTD Growth/Gross Margin/EBITDA/Client Retention) stay
              dropped, not faked — see salesDashboard.kpis.ts. */}
          {revenueTiles.length > 0 && (
            <SalesDashboardKpiCategoryGroup title="Pipeline Performance">
              {revenueTiles.map((t) => <SalesDashboardKpiTile key={t.id} label={t.label} value={t.value} tone={t.tone} icon={t.icon} sub={t.sub} />)}
            </SalesDashboardKpiCategoryGroup>
          )}

          {/* "My Accounts" — matches the prototype's 4-tile shell (sales.js:436-439) exactly, but
              every value is "-": real tenant data exists (tenant.salesPerson, getTenantStats), but
              there is no server-side filter to ask "tenants owned by me" yet. Shown as the same
              card layout the rest of this dashboard uses, not a prose placeholder. */}
          <SalesDashboardKpiCategoryGroup title="My Accounts">
            <SalesDashboardKpiTile label="No. of accounts" value="-" tone="brand" icon={FiBriefcase} sub="Pharma companies you cover" />
            <SalesDashboardKpiTile label="No. of divisions" value="-" tone="violet" icon={FiLayers} sub="Across your accounts" />
            <SalesDashboardKpiTile label="Division penetration" value="-" tone="teal" icon={FiPieChart} />
            <SalesDashboardKpiTile label="Billing till today" value="-" tone="emerald" icon={FiCreditCard} sub="Invoiced this year · your accounts" />
          </SalesDashboardKpiCategoryGroup>

          {pipelineTiles.length > 0 && (
            <SalesDashboardKpiCategoryGroup title="Pipeline & Forecast">
              {pipelineTiles.map((t) => <SalesDashboardKpiTile key={t.id} label={t.label} value={t.value} tone={t.tone} icon={t.icon} sub={t.sub} />)}
            </SalesDashboardKpiCategoryGroup>
          )}

          <SalesDashboardKpiCategoryGroup title="Camps & Projects">
            {projectsLoading && (
              <div className="rounded-xl border h-20 animate-pulse col-span-full" style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }} />
            )}
            {!projectsLoading && projectsIsError && (
              <div className="rounded-xl border p-3 text-[12px] col-span-full" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                Couldn't load your projects — try again shortly.
              </div>
            )}
            {!projectsLoading && !projectsIsError && projectTiles.map((t) => (
              <SalesDashboardKpiTile key={t.id} label={t.label} value={t.value} tone={t.tone} icon={t.icon} sub={t.sub} />
            ))}
          </SalesDashboardKpiCategoryGroup>
        </>
      )}

      <div className="mt-5">
        <SalesDashboardTabs active={tab} onChange={setTab} />

        {tab === 'today' && (
          <TodayTab
            leads={leads}
            onOpenLead={setOpenLeadId}
            companyRows={companyRows}
            projectTypeRows={projectTypeBillingRows}
            projectsLoading={projectsLoading}
            projectsError={projectsIsError}
            leadsLoading={sweep.isLoading}
            leadsError={sweep.isError}
            onRetryLeads={() => sweep.refetch()}
          />
        )}
        {tab === 'performance' && (
          canViewTeamReport
            ? (
              <PerformanceTab
                rows={leaderboard}
                isLoading={sweep.isLoading || appointmentSweep.isLoading}
                isError={sweep.isError || appointmentSweep.isError}
                onRetry={() => { if (sweep.isError) sweep.refetch(); if (appointmentSweep.isError) appointmentSweep.refetch() }}
              />
            )
            : <p className="text-[13px] py-6 text-center" style={{ color: 'var(--qms-text-muted)' }}>Team performance is available to lead managers.</p>
        )}
        {tab === 'activity' && (
          <ActivityTab
            leads={leads}
            appointments={appointments}
            onOpenLead={setOpenLeadId}
            showHeatmap={canViewTeamReport}
            isLoading={sweep.isLoading || (canViewTeamReport && appointmentSweep.isLoading)}
            isError={sweep.isError || (canViewTeamReport && appointmentSweep.isError)}
            onRetry={() => { if (sweep.isError) sweep.refetch(); if (appointmentSweep.isError) appointmentSweep.refetch() }}
          />
        )}
      </div>

      <LeadDrawer lead={openLead} onClose={() => setOpenLeadId(null)} onMoveStage={moveStage} onUpdateLead={updateLead} canManage={canManageLeadMutations} />
    </div>
  )
}

export default SalesDashboardPage
