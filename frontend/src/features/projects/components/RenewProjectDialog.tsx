import { useState } from 'react'
import type { Project } from '@/types/project.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { renewProjectSchema } from '@/features/projects/schemas/project.schemas'

function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

interface RenewProjectDialogProps {
  project: Project
  nextId: string
  onClose: () => void
  onConfirm: (input: { id: string; name: string; poDate: string; poExpiry: string; poNo: string }) => void
}

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

const RenewProjectDialog = ({ project, nextId, onClose, onConfirm }: RenewProjectDialogProps) => {
  const today = new Date().toISOString().slice(0, 10)
  const [id, setId] = useState(nextId)
  const [name, setName] = useState(`${project.name} · Renewal`)
  const [poDate, setPoDate] = useState(today)
  const [poExpiry, setPoExpiry] = useState(addMonthsIso(today, 12))
  const [poNo, setPoNo] = useState(project.poNo)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    const result = renewProjectSchema.safeParse({ id, name, poDate })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    onConfirm({ id, name, poDate, poExpiry, poNo })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Renew · {project.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            Cancellation policy, slots, team and reports are cloned · edit afterwards.
          </p>
          <div>
            <Label className={labelClasses} style={labelStyle}>New project ID *</Label>
            <Input type="text" value={id} onChange={(e) => setId(e.target.value)} className="text-[13px]" />
          </div>
          <div>
            <Label className={labelClasses} style={labelStyle}>New project name *</Label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} className="text-[13px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>New PO date *</Label>
              <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className="text-[13px]" />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>New PO expiry</Label>
              <Input type="date" value={poExpiry} onChange={(e) => setPoExpiry(e.target.value)} className="text-[13px]" />
            </div>
          </div>
          <div>
            <Label className={labelClasses} style={labelStyle}>New PO number</Label>
            <Input type="text" value={poNo} onChange={(e) => setPoNo(e.target.value)} className="text-[13px]" />
          </div>
          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>Renew project</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RenewProjectDialog
