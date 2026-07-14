import { useState } from 'react'
import type { Project, ProjectStatus } from '@/types/project.types'
import { PROJECT_STATUSES } from '@/types/project.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { statusChangeSchema } from '@/features/projects/schemas/project.schemas'

interface StatusChangeDialogProps {
  project: Project
  onClose: () => void
  onSave: (status: ProjectStatus, reason: string) => void
}

const StatusChangeDialog = ({ project, onClose, onSave }: StatusChangeDialogProps) => {
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    const result = statusChangeSchema.safeParse({ status, reason })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    onSave(status, reason)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Change status · {project.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>New status *</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
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
          <Button onClick={handleSave} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default StatusChangeDialog
