import type { LeadStatus } from '@/types/crm.types'
import StageMoveModal from '@/features/crm/components/StageMoveModal'
import type { useLeads } from '@/features/crm/hooks/useLeads'

interface LeadAdvanceModalProps {
  leadId: string
  currentStatus: LeadStatus
  toStatus: LeadStatus
  onMoveStage: ReturnType<typeof useLeads>['moveStage']
  onClose: () => void
}

// Wraps StageMoveModal for the "Move to {next} →" quick-action path (optional
// reason), as distinct from the Kanban drag-drop path (mandatory reason).
// `toStatus` is picked by the caller — when a status has more than one legal
// next value (e.g. proposal -> pilot/negotiation/lost), the caller renders one
// quick-action per legal target rather than guessing a single path, so this
// modal only ever confirms the one the user already chose.
const LeadAdvanceModal = ({ leadId, currentStatus, toStatus, onMoveStage, onClose }: LeadAdvanceModalProps) => (
  <StageMoveModal
    fromStatus={currentStatus}
    toStatus={toStatus}
    requireReason={false}
    onConfirm={(reason) => {
      onMoveStage(leadId, toStatus, reason || 'Advanced via quick action')
      onClose()
    }}
    onCancel={onClose}
  />
)

export default LeadAdvanceModal
