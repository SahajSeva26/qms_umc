import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FiDownload, FiPlus } from 'react-icons/fi'
import type { LeadStatus } from '@/types/crm.types'
import { usePermission } from '@/hooks/usePermission'
import { isForbiddenError, isNotFoundError } from '@/utils/apiError'
import { useLeads } from '@/features/crm/hooks/useLeads'
import { useLead } from '@/features/crm/hooks/useLead'
import { useLeadReport } from '@/features/crm/hooks/useLeadReport'
import { useMySalesSweep } from '@/features/crm/hooks/useMySalesSweep'
import { useCrmFilters } from '@/features/crm/hooks/useCrmFilters'
import { matchesFilters } from '@/features/crm/crm.filter'
import { computeKpis, computeValueKpis } from '@/features/crm/crm.kpis'
import { computeMyKpis } from '@/features/crm/crm.myKpis'
import { downloadLeadsCsv } from '@/features/crm/crm.export'
import { usePagination } from '@/hooks/usePagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { Button } from '@/components/ui/button'
import PaginationControls from '@/components/ui/PaginationControls'
import CrmKpiStrip from '@/features/crm/components/CrmKpiStrip'
import CrmFilterBar from '@/features/crm/components/CrmFilterBar'
import CompactView from '@/features/crm/components/views/CompactView'
import KanbanView from '@/features/crm/components/views/KanbanView'
import ListView from '@/features/crm/components/views/ListView'
import CalendarView from '@/features/crm/components/views/CalendarView'
import LeadDrawer from '@/features/crm/components/LeadDrawer'
import NewLeadWizard from '@/features/crm/components/NewLeadWizard'
import BottomInsightsRow from '@/features/crm/components/BottomInsightsRow'
import StageDrawer from '@/features/crm/components/StageDrawer'

const PAGE_SIZE = 10

type ViewMode = 'compact' | 'kanban' | 'list' | 'calendar'

const VIEW_LABELS: { id: ViewMode; label: string }[] = [
  { id: 'compact', label: 'Compact' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'list', label: 'List' },
  { id: 'calendar', label: 'Calendar' },
]

const CrmPage = () => {
  const { hasAnyPermission } = usePermission()
  // A lead:search-only caller can view their own leads but create/update/move-stage need more — hide controls that would only 403.
  const canManageLeads = hasAnyPermission(['lead:manage', 'tenant:manage'])
  // POST /leads also accepts lead:create (lighter than lead:manage — e.g. a sales rep creating their own lead).
  const canCreateLeads = hasAnyPermission(['lead:create', 'lead:manage', 'tenant:manage'])
  // PUT /:id and PATCH /:id/stage also accept lead:update (e.g. a sales rep editing/advancing their own lead).
  const canEditLeads = hasAnyPermission(['lead:update', 'lead:manage', 'tenant:manage'])
  // GET /leads/report is gated to lead:manage ONLY (not tenant:manage) at the route level — a
  // tenant:manage-only caller must fall into the own-scope "My Sales Dashboard" branch too, or
  // the report call 403s every time.
  const canViewLeadReport = hasAnyPermission(['lead:manage'])
  const { filters, setFilter, reset } = useCrmFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  // Debounced before reaching the query — undebounced, every keystroke changes useLeads' queryKey
  // and unmounts CrmFilterBar mid-typing. focusTherapy is a Select (discrete values), not free
  // text, so it doesn't need this.
  const debouncedQ = useDebouncedValue(filters.q)
  const debouncedCode = useDebouncedValue(filters.code)
  // All 6 filters are real, backend-supported params — needed server-side so count/totalPages
  // reflect the filtered total. matchesFilters below only re-applies status/title/date client-side.
  // report=true drives each row's stats.followUps (ListView only).
  const { leads, count, isLoading, error, moveStage, updateLead } = useLeads({
    status: filters.status || undefined,
    title: debouncedQ || undefined,
    code: debouncedCode || undefined,
    focusTherapy: filters.focusTherapy || undefined,
    fyFrom: filters.fyFrom || undefined,
    fyTo: filters.fyTo || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
    report: 'true',
  })
  // Unfiltered — always whole-tenant, independent of the table's own filters below.
  const { report, isLoading: reportLoading, error: reportError, refetch: refetchReport } = useLeadReport({}, canViewLeadReport)
  // Anyone without lead:manage (KAM, Sales Rep, or a tenant:manage-only caller) falls back to
  // "My Sales Dashboard", derived client-side from one full own-scoped /leads sweep instead.
  const mySweep = useMySalesSweep(!canViewLeadReport)
  const myKpis = useMemo(() => (mySweep.data ? computeMyKpis(mySweep.data) : []), [mySweep.data])

  // Prototype default: a rep-level (non-managing) caller lands on Compact;
  // everyone else lands on List (crm.js's role check, ported to this app's
  // own permission flag rather than a role-name string — see canManageLeads
  // above).
  const [view, setView] = useState<ViewMode>(canManageLeads ? 'list' : 'compact')
  // URL-backed so a notification's ?lead=<id> deep link opens the right drawer.
  const [searchParams, setSearchParams] = useSearchParams()
  const openLeadId = searchParams.get('lead')
  const setOpenLeadId = (id: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('lead', id)
    else next.delete('lead')
    setSearchParams(next, { replace: true })
  }
  const [wizardOpen, setWizardOpen] = useState(false)
  const [statusDrill, setStatusDrill] = useState<LeadStatus | null>(null)

  const filtered = useMemo(() => leads.filter((l) => matchesFilters(l, filters)), [leads, filters])
  const kpis = useMemo(() => computeKpis(report), [report])
  const valueKpis = useMemo(() => computeValueKpis(report), [report])

  // Deep-linked lead may not be on the loaded page — fall back to a direct GET /leads/:id.
  const leadFromList = leads.find((l) => l.id === openLeadId) ?? null
  const { data: fetchedLead, error: fetchedLeadError, refetch: refetchLead } =
    useLead(!leadFromList && openLeadId ? openLeadId : undefined)
  const openLead = leadFromList ?? fetchedLead?.data ?? null

  // A deep link (e.g. from a notification) whose target 404s, was deleted, or
  // belongs to another tenant would otherwise leave the user on this page
  // with no drawer, no error, and no explanation. Only treat a CONFIRMED
  // 403/404 as terminal and drop the dead ?lead= param — a transient failure
  // (network blip, 5xx) keeps the param and offers Retry instead, so it
  // doesn't lose the destination over a temporary issue.
  useEffect(() => {
    if (leadFromList || !openLeadId || !fetchedLeadError) return
    if (isForbiddenError(fetchedLeadError) || isNotFoundError(fetchedLeadError)) {
      toast.error("Couldn't load that lead — it may have been removed or you may not have access to it.")
      setOpenLeadId(null)
    } else {
      toast.error("Couldn't load that lead — try again.", { action: { label: 'Retry', onClick: () => refetchLead() } })
    }
    // leadFromList/setOpenLeadId/refetchLead are recreated every render; only
    // re-run this when the fetch outcome itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openLeadId, fetchedLeadError])

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>CRM & Sales</h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            CRM · Sales Pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--qms-surface-strong)' }}>
            {VIEW_LABELS.map((v) => (
              <Button
                key={v.id}
                variant="ghost"
                size="sm"
                onClick={() => setView(v.id)}
                className="rounded-lg"
                style={view === v.id ? { background: 'var(--qms-surface-card)', color: 'var(--qms-text)' } : { color: 'var(--qms-text-muted)' }}
              >
                {v.label}
              </Button>
            ))}
          </div>
          {canCreateLeads && (
            <Button
              onClick={() => setWizardOpen(true)}
              className="text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              <FiPlus size={14} /> New Lead
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => downloadLeadsCsv(filtered, `crm-leads-${new Date().toISOString().slice(0, 10)}.csv`)}
          >
            <FiDownload size={13} /> Export
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading leads…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load leads. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          {!canViewLeadReport && (
            <>
              {mySweep.isLoading && (
                <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-xl border p-3 h-18 animate-pulse"
                      style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
                    />
                  ))}
                </div>
              )}

              {!mySweep.isLoading && mySweep.isError && (
                <div className="flex items-center gap-3 text-[13px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
                  <span>Couldn't load your sales dashboard.</span>
                  <Button variant="outline" size="sm" onClick={() => mySweep.refetch()}>
                    Retry
                  </Button>
                </div>
              )}

              {!mySweep.isLoading && !mySweep.isError && mySweep.data && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    My Sales Dashboard · current portfolio
                  </p>
                  {mySweep.data.length === 0 ? (
                    <p className="text-[13px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
                      You have no leads yet.
                    </p>
                  ) : (
                    <CrmKpiStrip tiles={myKpis} />
                  )}
                </>
              )}
            </>
          )}

          {canViewLeadReport && reportLoading && (
            <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border p-3 h-18 animate-pulse"
                  style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
                />
              ))}
            </div>
          )}

          {canViewLeadReport && !reportLoading && reportError && (
            <div className="flex items-center gap-3 text-[13px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
              <span>Couldn't load stats.</span>
              <Button variant="outline" size="sm" onClick={() => refetchReport()}>
                Retry
              </Button>
            </div>
          )}

          {canViewLeadReport && !reportLoading && !reportError && report && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                All lead statistics
              </p>
              <CrmKpiStrip tiles={kpis} />
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2 mt-3" style={{ color: 'var(--qms-text-muted)' }}>
                Pipeline value
              </p>
              <CrmKpiStrip tiles={valueKpis} />
            </>
          )}

          <CrmFilterBar
            filters={filters}
            setFilter={(key, value) => { setFilter(key, value); resetToFirstPage() }}
            reset={() => { reset(); resetToFirstPage() }}
          />

          <div className="mb-4">
            {view === 'compact' && (
              <CompactView leads={filtered} onSelectStatus={setStatusDrill} />
            )}
            {view === 'kanban' && (
              <KanbanView leads={filtered} onOpen={setOpenLeadId} onMoveStage={moveStage} canManage={canEditLeads} />
            )}
            {view === 'list' && <ListView leads={filtered} onOpen={setOpenLeadId} onMoveStage={moveStage} canManage={canEditLeads} />}
            {view === 'calendar' && <CalendarView leads={filtered} onOpen={setOpenLeadId} />}
          </div>

          <PaginationControls page={page} totalPages={totalPages(count)} onPageChange={setPage} />

          <BottomInsightsRow leads={leads} onOpenLead={setOpenLeadId} showTopReps={canManageLeads} />
        </>
      )}

      <LeadDrawer lead={openLead} onClose={() => setOpenLeadId(null)} onMoveStage={moveStage} onUpdateLead={updateLead} canManage={canEditLeads} />

      {wizardOpen && (
        <NewLeadWizard
          onClose={() => setWizardOpen(false)}
          onCreated={() => setWizardOpen(false)}
        />
      )}

      <StageDrawer
        status={statusDrill}
        leads={leads}
        onClose={() => setStatusDrill(null)}
        onOpenLead={(id) => {
          setStatusDrill(null)
          setOpenLeadId(id)
        }}
        onNewLead={() => {
          setStatusDrill(null)
          setWizardOpen(true)
        }}
        canManage={canCreateLeads}
      />
    </div>
  )
}

export default CrmPage
