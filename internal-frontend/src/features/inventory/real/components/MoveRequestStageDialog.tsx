import { useState } from 'react'
import { INVENTORY_REQUEST_STATUS_LABEL } from '@/types/inventoryRequest.types'
import type { InventoryRequestStatus } from '@/types/inventoryRequest.types'
import { useMoveInventoryRequestStage } from '@/features/inventory/real/hooks/useMoveInventoryRequestStage'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import FieldLabel from '@/components/ui/FieldLabel'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'

interface MoveRequestStageDialogProps {
  requestId: string
  to: InventoryRequestStatus
  onClose: () => void
  onSuccess: () => void
}

// A single required-reason prompt before firing moveStage — the backend
// requires a non-empty reason on every transition (MoveStagePayloadSchema).
const MoveRequestStageDialog = ({ requestId, to, onClose, onSuccess }: MoveRequestStageDialogProps) => {
  const [reason, setReason] = useState('')
  const mutation = useMoveInventoryRequestStage(requestId)

  const handleSubmit = () => {
    if (!reason.trim()) return
    mutation.mutate({ to, reason: reason.trim() }, { onSuccess })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            Move to {INVENTORY_REQUEST_STATUS_LABEL[to]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 min-w-0">
          <div>
            <FieldLabel>Reason *</FieldLabel>
            {/* max-h/overflow-y-auto — Textarea auto-grows to fit all content
                by default (field-sizing-content, no internal scroll); a
                pasted wall of text would otherwise stretch this dialog well
                past the viewport, same failure mode as Item Master's
                Description field. */}
            <Textarea rows={3} className="text-[13px] max-h-40 overflow-y-auto" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <MutationStatusBanner mutation={mutation} errorFallback="Could not update the request — try again." showSuccess={false} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="button" disabled={!reason.trim() || mutation.isPending} onClick={handleSubmit}>
              {mutation.isPending ? 'Saving…' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MoveRequestStageDialog
