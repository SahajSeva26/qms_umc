import type { LeadStage } from '@/types/lead.types'
import { STAGE_ORDER } from '@/features/crm/crm.mock'
import StageMoveModal from '@/features/crm/components/StageMoveModal'
import { useLeads } from '@/features/crm/hooks/useLeads'

interface LeadAdvanceModalProps {
  leadId: string
  currentStage: LeadStage
  onMoveStage: ReturnType<typeof useLeads>['moveStage']
  onMarkLost: ReturnType<typeof useLeads>['markLost']
  onClose: () => void
}

// Wraps StageMoveModal for the "Move to {next} →" button path (optional reason,
// forward-only), as distinct from the Kanban drag-drop path (mandatory reason).
const LeadAdvanceModal = ({ leadId, currentStage, onMoveStage, onMarkLost, onClose }: LeadAdvanceModalProps) => {
  const nextIndex = STAGE_ORDER.indexOf(currentStage) + 1
  const toStage = nextIndex < STAGE_ORDER.length ? STAGE_ORDER[nextIndex] : null
  if (!toStage) return null

  return (
    <StageMoveModal
      fromStage={currentStage}
      toStage={toStage}
      requireReason={false}
      onConfirm={(reason) => {
        onMoveStage(leadId, toStage, reason || 'Advanced via quick action')
        onClose()
      }}
      onCancel={onClose}
      onMarkLost={() => {
        onMarkLost(leadId, 'Other', 'Marked lost from quick action')
        onClose()
      }}
    />
  )
}

export default LeadAdvanceModal
