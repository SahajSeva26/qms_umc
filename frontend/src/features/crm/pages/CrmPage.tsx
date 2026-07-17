import { useMemo, useState } from 'react'
import { FiDownload, FiPlus, FiUpload } from 'react-icons/fi'
import type { KpiTile, StageMeta } from '@/types/lead.types'
import { STAGES } from '@/features/crm/crm.mock'
import { useAuth } from '@/hooks/useAuth'
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
import BottomInsightsRow from '@/features/crm/components/BottomInsightsRow'
import LeadAdvanceModal from '@/features/crm/components/LeadAdvanceModal'
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
  const { leads, isLoading, error, moveStage, markLost, reopen, createLead } = useLeads()
  const { filters, setFilter, reset } = useCrmFilters()

  const [view, setView] = useState<ViewMode>(isKam ? 'compact' : 'list')
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)
  const [pendingAdvance, setPendingAdvance] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [kpiDrill, setKpiDrill] = useState<KpiTile | null>(null)
  const [stageDrill, setStageDrill] = useState<StageMeta | null>(null)

  const scoped = useMemo(() => scopedByOwner(leads, user?.firstName, isKam), [leads, user, isKam])
  const filtered = useMemo(() => scoped.filter((l) => matchesFilters(l, filters)), [scoped, filters])
  const kpis = useMemo(() => computeKpis(scoped, isKam), [scoped, isKam])

  const openLead = leads.find((l) => l.id === openLeadId) ?? null
  const advanceLead = leads.find((l) => l.id === pendingAdvance) ?? null

  const handleAdvanceRequest = (id: string) => setPendingAdvance(id)

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
          <Button
            onClick={() => setWizardOpen(true)}
            className="text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New Lead
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled
            title="Bulk import isn't wired up in the source prototype either — no handler to port."
          >
            <FiUpload size={13} /> Import
          </Button>
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
              <CompactView
                leads={filtered}
                onSelectStage={(stageId) => setStageDrill(STAGES.find((s) => s.id === stageId) ?? null)}
              />
            )}
            {view === 'kanban' && (
              <KanbanView
                leads={filtered}
                onOpen={setOpenLeadId}
                onMoveStage={moveStage}
                onMarkLost={(id) => {
                  setOpenLeadId(id)
                }}
              />
            )}
            {view === 'list' && <ListView leads={filtered} onOpen={setOpenLeadId} onAdvance={handleAdvanceRequest} />}
            {view === 'calendar' && <CalendarView />}
          </div>

          <BottomInsightsRow leads={scoped} />
        </>
      )}

      <LeadDrawer lead={openLead} onClose={() => setOpenLeadId(null)} onMarkLost={markLost} onReopen={reopen} />

      {wizardOpen && (
        <NewLeadWizard
          existingLeads={leads}
          onClose={() => setWizardOpen(false)}
          onCreate={(lead) => {
            createLead(lead)
            setWizardOpen(false)
            setOpenLeadId(lead.id)
          }}
        />
      )}

      {advanceLead && (
        <LeadAdvanceModal
          leadId={advanceLead.id}
          currentStage={advanceLead.stage}
          onMoveStage={moveStage}
          onMarkLost={markLost}
          onClose={() => setPendingAdvance(null)}
        />
      )}

      {kpiDrill && (
        <KpiDrillDrawer tile={kpiDrill} leads={scoped} onClose={() => setKpiDrill(null)} />
      )}

      <StageDrawer
        stage={stageDrill}
        leads={scoped}
        onClose={() => setStageDrill(null)}
        onOpenLead={(id) => {
          setStageDrill(null)
          setOpenLeadId(id)
        }}
        onNewLead={() => {
          setStageDrill(null)
          setWizardOpen(true)
        }}
      />
    </div>
  )
}

export default CrmPage
