import { useState } from 'react'
import type { LeadEntity, LeadStatus } from '@/types/crm.types'
import { LEAD_STATUS_LABEL, LEAD_STATUS_COLOR, LEAD_TRANSITION_MAP } from '@/types/crm.types'
import { formatINR } from '@/utils/formatters'
import LeadCard from '@/features/crm/components/LeadCard'
import StageMoveModal from '@/features/crm/components/StageMoveModal'

const COLUMNS = Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]

interface KanbanViewProps {
  leads: LeadEntity[]
  onOpen: (id: string) => void
  onMoveStage: (id: string, to: LeadStatus, reason: string) => void
}

const KanbanView = ({ leads, onOpen, onMoveStage }: KanbanViewProps) => {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null)
  const [pendingMove, setPendingMove] = useState<{ lead: LeadEntity; to: LeadStatus } | null>(null)

  const draggingLead = draggingId ? leads.find((l) => l.id === draggingId) ?? null : null
  const legalTargets = draggingLead ? LEAD_TRANSITION_MAP[draggingLead.status] : []

  const requestMove = (leadId: string, to: LeadStatus) => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.status === to) return
    if (!LEAD_TRANSITION_MAP[lead.status].includes(to)) return
    setPendingMove({ lead, to })
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(240px, 1fr))` }}>
        {COLUMNS.map((status) => {
          const columnLeads = leads.filter((l) => l.status === status)
          const total = columnLeads.reduce((sum, l) => sum + l.estimatedValue, 0)
          const isDragOver = dragOverStatus === status
          const isLegalTarget = !draggingLead || draggingLead.status === status || legalTargets.includes(status)

          return (
            <div
              key={status}
              onDragOver={(e) => {
                if (!isLegalTarget) return
                e.preventDefault()
                setDragOverStatus(status)
              }}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverStatus(null)
                if (draggingId && isLegalTarget) requestMove(draggingId, status)
              }}
              className="rounded-2xl border p-2.5 transition-all"
              style={{
                background: isDragOver ? 'var(--qms-surface-strong)' : 'var(--qms-surface)',
                borderColor: isDragOver ? 'var(--qms-brand)' : 'var(--qms-border)',
                opacity: isLegalTarget ? 1 : 0.45,
                cursor: draggingLead && !isLegalTarget ? 'not-allowed' : undefined,
              }}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: LEAD_STATUS_COLOR[status] }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>
                    {LEAD_STATUS_LABEL[status]}
                  </div>
                </div>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                  {columnLeads.length}
                </span>
              </div>
              <div className="text-[11px] font-semibold px-1 mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                {formatINR(total)}
              </div>

              <div className="min-h-[80px]">
                {columnLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onOpen={onOpen}
                    onAdvance={(id, to) => requestMove(id, to)}
                    draggable
                    onDragStart={(_, id) => setDraggingId(id)}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setDragOverStatus(null)
                    }}
                  />
                ))}
                {columnLeads.length === 0 && (
                  <div
                    className="text-center text-[11px] py-6 rounded-xl border border-dashed"
                    style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
                  >
                    Drop a lead here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {pendingMove && (
        <StageMoveModal
          fromStatus={pendingMove.lead.status}
          toStatus={pendingMove.to}
          requireReason
          onConfirm={(reason) => {
            onMoveStage(pendingMove.lead.id, pendingMove.to, reason)
            setPendingMove(null)
          }}
          onCancel={() => setPendingMove(null)}
        />
      )}
    </div>
  )
}

export default KanbanView
