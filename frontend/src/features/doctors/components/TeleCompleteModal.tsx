import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import type { TeleConsult } from '@/features/doctors/components/tabs/TeleConsultTab.types'

interface TeleCompleteModalProps {
  open: boolean
  consult: TeleConsult | null
  onClose: () => void
  onSave: (notes: string, rx: string) => void
}

// Outer shell only mounts the form while a consult is open — keyed on the
// consult id so its draft state resets fresh per consult without a useEffect.
const TeleCompleteModal = ({ open, consult, onClose, onSave }: TeleCompleteModalProps) => {
  if (!open || !consult) return null
  return <TeleCompleteModalForm key={consult.id} consult={consult} onClose={onClose} onSave={onSave} />
}

interface TeleCompleteModalFormProps {
  consult: TeleConsult
  onClose: () => void
  onSave: (notes: string, rx: string) => void
}

const TeleCompleteModalForm = ({ consult, onClose, onSave }: TeleCompleteModalFormProps) => {
  const [notes, setNotes] = useState(consult.notes ?? '')
  const [rx, setRx] = useState(consult.rx ?? '')

  const handleSave = () => {
    onSave(notes, rx)
    toast.success('Tele-consult notes saved')
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{consult.patientName} — notes &amp; Rx</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Consultation notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="text-[13px]" />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Prescription (Rx)</label>
            <Textarea value={rx} onChange={(e) => setRx(e.target.value)} rows={3} className="text-[13px]" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save &amp; mark completed</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TeleCompleteModal
