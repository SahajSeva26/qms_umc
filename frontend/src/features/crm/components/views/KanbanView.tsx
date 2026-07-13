import { useState } from 'react'
import type { Lead, LeadStage } from '@/types/lead.types'
import { STAGES } from '@/features/crm/crm.mock'
import { formatINR } from '@/utils/formatters'
import LeadCard from '@/features/crm/components/LeadCard'
import StageMoveModal from '@/features/crm/components/StageMoveModal'
import { STAGE_ORDER } from '@/features/crm/crm.mock'

interface KanbanViewProps {
  leads: Lead[]
  onOpen: (id: string) => void
  onMoveStage: (id: string, toStage: LeadStage, reason: string) => void
  onMarkLost: (id: string) => void
}

const KanbanView = ({ leads, onOpen, onMoveStage, onMarkLost }: KanbanViewProps) => {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null)
  const [pendingMove, setPendingMove] = useState<{ lead: Lead; toStage: LeadStage } | null>(null)

  const requestMove = (leadId: string, toStage: LeadStage) => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.stage === toStage) return
    setPendingMove({ lead, toStage })
  }

  const handleAdvance = (id: string) => {
    const lead = leads.find((l) => l.id === id)
    if (!lead) return
    const nextIndex = STAGE_ORDER.indexOf(lead.stage) + 1
    if (nextIndex < STAGE_ORDER.length) requestMove(id, STAGE_ORDER[nextIndex])
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(260px, 1fr))` }}>
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage.id)
          const total = stageLeads.reduce((sum, l) => sum + l.value, 0)
          const isDragOver = dragOverStage === stage.id

          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverStage(stage.id)
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverStage(null)
                if (draggingId) requestMove(draggingId, stage.id)
              }}
              className="rounded-2xl border p-2.5 transition-all"
              style={{
                background: isDragOver ? 'var(--qms-surface-strong)' : 'var(--qms-surface)',
                borderColor: isDragOver ? 'var(--qms-brand)' : 'var(--qms-border)',
              }}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stage.color }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{stage.name}</div>
                  <div className="text-[10px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{stage.desc}</div>
                </div>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                  {stageLeads.length}
                </span>
              </div>
              <div className="text-[11px] font-semibold px-1 mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                {formatINR(total)}
              </div>

              <div className="min-h-[80px]">
                {stageLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onOpen={onOpen}
                    onAdvance={handleAdvance}
                    draggable
                    onDragStart={(_, id) => setDraggingId(id)}
                    onDragEnd={() => setDraggingId(null)}
                  />
                ))}
                {stageLeads.length === 0 && (
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
          fromStage={pendingMove.lead.stage}
          toStage={pendingMove.toStage}
          requireReason
          onConfirm={(reason) => {
            onMoveStage(pendingMove.lead.id, pendingMove.toStage, reason)
            setPendingMove(null)
          }}
          onCancel={() => setPendingMove(null)}
          onMarkLost={() => {
            onMarkLost(pendingMove.lead.id)
            setPendingMove(null)
          }}
        />
      )}
    </div>
  )
}

export default KanbanView
