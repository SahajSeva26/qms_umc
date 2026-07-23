import { useState } from 'react'
import type { ProjectEntity, ProjectStatus } from '@/types/project.types'
import { PROJECT_STAGE_TRANSITION_MAP, PROJECT_STATUS_LABEL } from '@/types/project.types'
import { useMoveProjectStage } from '@/features/projects/hooks/useMoveProjectStage'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { moveStageSchema } from '@/features/projects/schemas/project.schemas'

interface StatusChangeDialogProps {
  project: ProjectEntity
  onClose: () => void
}

// Backed by the single generic PATCH /projects/:id/stage endpoint — this is
// also where "Close project" lands (folded in rather than kept as its own
// dialog, since closing is just a stage move to 'closed' server-side; the
// old mock's separate closeReason field has no backend counterpart, the
// reason lives only inside this stageHistory entry).
const StatusChangeDialog = ({ project, onClose }: StatusChangeDialogProps) => {
  const legalTargets = PROJECT_STAGE_TRANSITION_MAP[project.status]
  const [status, setStatus] = useState<ProjectStatus | ''>(legalTargets[0] ?? '')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const moveStage = useMoveProjectStage()

  const handleSave = async () => {
    const result = moveStageSchema.safeParse({ reason })
    if (!result.success || !status) {
      setError(result.success ? 'Select a status.' : result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setError(null)
    try {
      await moveStage.mutateAsync({ id: project.id, payload: { to: status, reason } })
      onClose()
    } catch {
      // no-op: useMoveProjectStage's onError already toasted
    }
  }

  if (legalTargets.length === 0) {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Change status · {project.name}</DialogTitle>
          </DialogHeader>
          <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
            This project is closed — closed is a terminal status with no further transitions.
          </p>
          <div className="flex justify-end mt-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Change status · {project.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>New status *</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {legalTargets.map((s) => (
                  <SelectItem key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Reason *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="text-[13px]" placeholder="Why is the status changing?" />
          </div>
          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={moveStage.isPending} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            {moveStage.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default StatusChangeDialog
