import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FiDownload, FiPlus, FiUpload } from 'react-icons/fi'
import type { KpiTile, LeadStatus } from '@/types/crm.types'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { useLeads } from '@/features/crm/hooks/useLeads'
import { useCrmFilters } from '@/features/crm/hooks/useCrmFilters'
import { matchesFilters, scopedByOwner } from '@/features/crm/crm.filter'
import { computeKpis } from '@/features/crm/crm.kpis'
import { downloadLeadsCsv } from '@/features/crm/crm.export'
import { Button } from '@/components/ui/button'
import CrmKpiStrip from '@/features/crm/components/CrmKpiStrip'
import CrmFilterBar from '@/features/crm/components/CrmFilterBar'
import CompactView from '@/features/crm/components/views/CompactView'
import KanbanView from '@/features/crm/components/views/KanbanView'
import ListView from '@/features/crm/components/views/ListView'
import CalendarView from '@/features/crm/components/views/CalendarView'
import LeadDrawer from '@/features/crm/components/LeadDrawer'
import NewLeadWizard from '@/features/crm/components/NewLeadWizard'
import ImportLeadsDialog from '@/features/crm/components/ImportLeadsDialog'
import BottomInsightsRow from '@/features/crm/components/BottomInsightsRow'
import KpiDrillDrawer from '@/features/crm/components/KpiDrillDrawer'
import StageDrawer from '@/features/crm/components/StageDrawer'

type ViewMode = 'compact' | 'kanban' | 'list' | 'calendar'

const VIEW_LABELS: { id: ViewMode; label: string }[] = [
  { id: 'compact', label: 'Compact' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'list', label: 'List' },
  { id: 'calendar', label: 'Calendar' },
]

const CrmPage = () => {
  const { user } = useAuth()
  const isKam = user?.role === 'sales_rep'
  const { leads, isLoading, error, moveStage, updateLead } = useLeads()
  const queryClient = useQueryClient()
  const { hasAnyPermission } = usePermission()
  // A lead:search-only caller (the real "Sales" rep business role — see
  // lead.constants.ts's LEAD_BUSINESS_ROLE_TYPES) can view their own leads
  // (server-side row-scoped) but the backend's create/update/move-stage
  // routes still require lead:manage/tenant:manage (lead.routes.ts's GUARD,
  // deliberately narrower than READ_GUARD — confirmed via the teammate's own
  // commit history, not an oversight). Hide the controls that would only
  // 403 for such a caller rather than showing them and letting them fail.
  const canManageLeads = hasAnyPermission(['lead:manage', 'tenant:manage'])
  const { filters, setFilter, reset } = useCrmFilters()

  const [view, setView] = useState<ViewMode>(isKam ? 'compact' : 'list')
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [kpiDrill, setKpiDrill] = useState<KpiTile | null>(null)
  const [statusDrill, setStatusDrill] = useState<LeadStatus | null>(null)

  const scoped = useMemo(() => scopedByOwner(leads, user?._id, isKam), [leads, user, isKam])
  const filtered = useMemo(() => scoped.filter((l) => matchesFilters(l, filters)), [scoped, filters])
  const kpis = useMemo(() => computeKpis(scoped, isKam), [scoped, isKam])

  const openLead = leads.find((l) => l.id === openLeadId) ?? null

  return (
    <div className="max-w-7xl">
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
          {canManageLeads && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <FiUpload size={13} /> Import
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
          <CrmKpiStrip tiles={kpis} onDrill={setKpiDrill} />
          <CrmFilterBar filters={filters} setFilter={setFilter} reset={reset} />

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

          <BottomInsightsRow leads={scoped} />
        </>
      )}

      <LeadDrawer lead={openLead} onClose={() => setOpenLeadId(null)} onMoveStage={moveStage} onUpdateLead={updateLead} canManage={canManageLeads} />

      {wizardOpen && (
        <NewLeadWizard
          onClose={() => setWizardOpen(false)}
          onCreated={() => setWizardOpen(false)}
        />
      )}

      {importOpen && (
        <ImportLeadsDialog
          onClose={() => setImportOpen(false)}
          onImported={() => queryClient.invalidateQueries({ queryKey: ['leads'] })}
        />
      )}

      {kpiDrill && (
        <KpiDrillDrawer tile={kpiDrill} leads={scoped} onClose={() => setKpiDrill(null)} />
      )}

      <StageDrawer
        status={statusDrill}
        leads={scoped}
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
