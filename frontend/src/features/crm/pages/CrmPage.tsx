import { useMemo, useState } from 'react'
import { FiDownload, FiPlus } from 'react-icons/fi'
import type { LeadStatus } from '@/types/crm.types'
import { usePermission } from '@/hooks/usePermission'
import { useLeads } from '@/features/crm/hooks/useLeads'
import { useLeadReport } from '@/features/crm/hooks/useLeadReport'
import { useCrmFilters } from '@/features/crm/hooks/useCrmFilters'
import { matchesFilters } from '@/features/crm/crm.filter'
import { computeKpis, computeValueKpis } from '@/features/crm/crm.kpis'
import { downloadLeadsCsv } from '@/features/crm/crm.export'
import { usePagination } from '@/hooks/usePagination'
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
  // A lead:search-only caller can view their own leads but create/update/
  // move-stage still require lead:manage/tenant:manage — hide controls that
  // would only 403 rather than showing them and letting them fail.
  const canManageLeads = hasAnyPermission(['lead:manage', 'tenant:manage'])
  const { filters, setFilter, reset } = useCrmFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  // All 6 filters are real, backend-supported params — needed server-side so count/totalPages
  // reflect the filtered total. matchesFilters below only re-applies status/title/date client-side.
  // report=true drives each row's stats.followUps (ListView only).
  const { leads, count, isLoading, error, moveStage, updateLead } = useLeads({
    status: filters.status || undefined,
    title: filters.q || undefined,
    code: filters.code || undefined,
    focusTherapy: filters.focusTherapy || undefined,
    fyFrom: filters.fyFrom || undefined,
    fyTo: filters.fyTo || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
    report: 'true',
  })
  // Unfiltered — always whole-tenant, independent of the table's own filters below.
  const { report, isLoading: reportLoading, error: reportError } = useLeadReport({}, canManageLeads)

  // Prototype default: a rep-level (non-managing) caller lands on Compact;
  // everyone else lands on List (crm.js's role check, ported to this app's
  // own permission flag rather than a role-name string — see canManageLeads
  // above).
  const [view, setView] = useState<ViewMode>(canManageLeads ? 'list' : 'compact')
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [statusDrill, setStatusDrill] = useState<LeadStatus | null>(null)

  const filtered = useMemo(() => leads.filter((l) => matchesFilters(l, filters)), [leads, filters])
  const kpis = useMemo(() => computeKpis(report), [report])
  const valueKpis = useMemo(() => computeValueKpis(report), [report])

  const openLead = leads.find((l) => l.id === openLeadId) ?? null

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
          {canManageLeads && (
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
          {!canManageLeads && (
            <p className="text-[13px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
              Statistics are available to lead managers.
            </p>
          )}

          {canManageLeads && reportLoading && (
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

          {canManageLeads && !reportLoading && reportError && (
            <p className="text-[13px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
              Couldn't load stats.
            </p>
          )}

          {canManageLeads && !reportLoading && !reportError && report && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                All lead statistics
              </p>
              <CrmKpiStrip tiles={kpis} />
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2 mt-3" style={{ color: 'var(--qms-text-muted)' }}>
                Pipeline value
              </p>
              <CrmKpiStrip tiles={valueKpis} />
              {report.kpis.topRep && (
                <p className="text-[12px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Top rep (all-time): <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{report.kpis.topRep.name}</span>
                  {' · '}{report.kpis.topRep.wonCount} won
                </p>
              )}
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
              <KanbanView leads={filtered} onOpen={setOpenLeadId} onMoveStage={moveStage} canManage={canManageLeads} />
            )}
            {view === 'list' && <ListView leads={filtered} onOpen={setOpenLeadId} onMoveStage={moveStage} canManage={canManageLeads} />}
            {view === 'calendar' && <CalendarView leads={filtered} onOpen={setOpenLeadId} />}
          </div>

          <PaginationControls page={page} totalPages={totalPages(count)} onPageChange={setPage} />

          <BottomInsightsRow leads={leads} onOpenLead={setOpenLeadId} />
        </>
      )}

      <LeadDrawer lead={openLead} onClose={() => setOpenLeadId(null)} onMoveStage={moveStage} onUpdateLead={updateLead} canManage={canManageLeads} />

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
        canManage={canManageLeads}
      />
    </div>
  )
}

export default CrmPage
