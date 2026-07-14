import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import type { Project } from '@/types/project.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { voidCampSchema } from '@/features/projects/schemas/project.schemas'
import { formatDate } from '@/utils/formatters'

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

interface VoidCampDialogProps {
  project: Project
  onClose: () => void
  onAdd: (input: { date: string; doctorName: string; city: string; mailUrl: string; approvedBy: string; notes: string }) => void
  onRemove: (voidCampId: string) => void
}

const VoidCampDialog = ({ project, onClose, onAdd, onRemove }: VoidCampDialogProps) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [doctorName, setDoctorName] = useState('')
  const [city, setCity] = useState('')
  const [mailUrl, setMailUrl] = useState('')
  const [approvedBy, setApprovedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    const result = voidCampSchema.safeParse({ date, doctorName, mailUrl, approvedBy })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Date, doctor, mail URL and approver are required.')
      return
    }
    onAdd({ date, doctorName, city, mailUrl, approvedBy, notes })
    setDoctorName('')
    setCity('')
    setMailUrl('')
    setApprovedBy('')
    setNotes('')
    setError(null)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Add void camp · {project.id}</DialogTitle>
        </DialogHeader>
        <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          A void camp executes without a PO, on the basis of QMS management approval after a mail
          confirmation from the pharma. Audit-logged separately from billable camps.
        </p>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>Camp date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-[13px]" />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>City</Label>
              <Input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="text-[13px]" />
            </div>
          </div>
          <div>
            <Label className={labelClasses} style={labelStyle}>Doctor name *</Label>
            <Input type="text" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className="text-[13px]" />
          </div>
          <div>
            <Label className={labelClasses} style={labelStyle}>Pharma confirmation mail URL *</Label>
            <Input type="text" value={mailUrl} onChange={(e) => setMailUrl(e.target.value)} className="text-[13px]" placeholder="https://..." />
          </div>
          <div>
            <Label className={labelClasses} style={labelStyle}>Approved by (QMS management) *</Label>
            <Input type="text" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} className="text-[13px]" />
          </div>
          <div>
            <Label className={labelClasses} style={labelStyle}>Approval notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-[13px]" />
          </div>
          {error && <p className="text-[12px] text-danger">{error}</p>}
          <Button onClick={handleAdd} variant="secondary" className="w-full">Add void camp</Button>
        </div>

        {project.voidCamps.length > 0 && (
          <div className="mt-4 space-y-2">
            <Label className={labelClasses} style={labelStyle}>Existing void camps</Label>
            {project.voidCamps.map((v) => (
              <div key={v.id} className="flex items-start justify-between gap-2 p-2.5 rounded-lg" style={{ background: 'var(--qms-surface-strong)' }}>
                <div className="text-[12px]" style={{ color: 'var(--qms-text)' }}>
                  <div className="font-semibold">{formatDate(v.date)} · {v.doctorName}{v.city ? ` · ${v.city}` : ''}</div>
                  <div style={{ color: 'var(--qms-text-muted)' }}>Approved by {v.approvedBy}</div>
                </div>
                <button onClick={() => onRemove(v.id)} aria-label="Remove void camp" style={{ color: 'var(--qms-text-muted)' }}>
                  <FiX size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end mt-4">
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default VoidCampDialog
