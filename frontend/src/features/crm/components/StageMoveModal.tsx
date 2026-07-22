import { useState } from 'react'
import type { LeadStatus } from '@/types/crm.types'
import { LEAD_STATUS_LABEL } from '@/types/crm.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { stageMoveReasonSchema } from '@/features/crm/schemas/lead.schemas'

interface StageMoveModalProps {
  fromStatus: LeadStatus
  toStatus: LeadStatus
  requireReason: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}

const StageMoveModal = ({ fromStatus, toStatus, requireReason, onConfirm, onCancel }: StageMoveModalProps) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    if (requireReason) {
      const result = stageMoveReasonSchema.safeParse({ reason })
      if (!result.success) {
        setError(result.error.issues[0]?.message ?? 'Reason is required.')
        return
      }
    }
    onConfirm(reason.trim())
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            {toStatus === 'lost' ? 'Mark lead as lost' : 'Move lead'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-[12px]">
          <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
            {LEAD_STATUS_LABEL[fromStatus]}
          </span>
          <span style={{ color: 'var(--qms-text-muted)' }}>→</span>
          <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text)' }}>
            {LEAD_STATUS_LABEL[toStatus]}
          </span>
        </div>

        <div>
          <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Reason for moving {requireReason && '*'}
          </Label>
          <Textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setError(null)
            }}
            rows={3}
            className="text-[13px]"
            aria-invalid={!!error}
          />
          {error && <p className="text-[11px] mt-1 text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={toStatus === 'lost' ? 'destructive' : 'default'} onClick={handleConfirm}>
            {toStatus === 'lost' ? 'Confirm lost' : 'Confirm move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default StageMoveModal
