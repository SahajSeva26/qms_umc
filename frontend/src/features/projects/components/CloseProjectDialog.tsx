import { useState } from 'react'
import type { Project } from '@/types/project.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { closeProjectSchema } from '@/features/projects/schemas/project.schemas'

interface CloseProjectDialogProps {
  project: Project
  onClose: () => void
  onConfirm: (reason: string) => void
}

const CloseProjectDialog = ({ project, onClose, onConfirm }: CloseProjectDialogProps) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    const result = closeProjectSchema.safeParse({ reason })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please provide a close reason.')
      return
    }
    onConfirm(reason)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Close project · {project.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
            {project.name} will be marked as Closed. This can be reversed with Reopen.
          </p>
          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Close reason *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="text-[13px]" placeholder="Why is this project closing?" />
          </div>
          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} className="font-bold text-white" style={{ background: 'var(--danger)' }}>Close project</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CloseProjectDialog
