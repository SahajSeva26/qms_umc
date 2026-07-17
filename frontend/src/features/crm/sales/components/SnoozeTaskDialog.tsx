import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import DatePicker from '@/components/ui/DatePicker'
import { TIME_OPTIONS } from '@/features/crm/appointments/appointments.utils'
import { snoozeTaskSchema } from '@/features/crm/sales/schemas'

interface SnoozeTaskDialogProps {
  onClose: () => void
  onConfirm: (snoozedTo: string, snoozedTime?: string) => void
}

const FieldLabel = ({ children }: { children: string }) => (
  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
    {children}
  </Label>
)

const SnoozeTaskDialog = ({ onClose, onConfirm }: SnoozeTaskDialogProps) => {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  const [snoozedTo, setSnoozedTo] = useState(tomorrow)
  const [snoozedTime, setSnoozedTime] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    const result = snoozeTaskSchema.safeParse({ snoozedTo, snoozedTime })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Pick a date to snooze to.')
      return
    }
    onConfirm(result.data.snoozedTo, result.data.snoozedTime || undefined)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Snooze task</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Snooze to *</FieldLabel>
            <DatePicker value={snoozedTo} onChange={(v) => { setSnoozedTo(v); setError(null) }} className="w-full text-[13px]" />
          </div>
          <div>
            <FieldLabel>Time (optional)</FieldLabel>
            <Select value={snoozedTime} onValueChange={(v) => setSnoozedTime(v as string)}>
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
          <Button onClick={handleConfirm}>Snooze</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SnoozeTaskDialog
