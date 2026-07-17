import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import DatePicker from '@/components/ui/DatePicker'
import { TIME_OPTIONS } from '@/features/crm/appointments/appointments.utils'
import { addTaskSchema } from '@/features/crm/sales/schemas'
import type { AddTaskInput } from '@/features/crm/sales/sales.tasks.service'

interface AddTaskDialogProps {
  ownerKey: string
  onClose: () => void
  onSave: (input: AddTaskInput) => void
}

const FieldLabel = ({ children }: { children: string }) => (
  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
    {children}
  </Label>
)

const AddTaskDialog = ({ ownerKey, onClose, onSave }: AddTaskDialogProps) => {
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [dueOn, setDueOn] = useState(new Date().toISOString().slice(0, 10))
  const [dueTime, setDueTime] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    const result = addTaskSchema.safeParse({ title, detail, dueOn, dueTime })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Task title is required.')
      return
    }
    onSave({ ...result.data, ownerKey })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Add task</DialogTitle>
        </DialogHeader>

        <div>
          <FieldLabel>Task *</FieldLabel>
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(null) }}
            placeholder="e.g. Send PPT v3 to Sun Pharma"
            className="text-[13px]"
          />
        </div>

        <div>
          <FieldLabel>Notes / context</FieldLabel>
          <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={2} className="text-[13px]" placeholder="Optional" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Due date</FieldLabel>
            <DatePicker value={dueOn} onChange={setDueOn} className="w-full text-[13px]" />
          </div>
          <div>
            <FieldLabel>Due time (optional)</FieldLabel>
            <Select value={dueTime} onValueChange={(v) => setDueTime(v as string)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Any time" /></SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <p className="text-[11px] text-danger">{error}</p>}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Add task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddTaskDialog
