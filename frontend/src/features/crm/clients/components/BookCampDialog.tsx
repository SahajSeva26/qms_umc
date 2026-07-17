import { useState } from 'react'
import type { Client, ClientMr, ClientProject, ClientProjectType, Division } from '@/types/client.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import DatePicker from '@/components/ui/DatePicker'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { bookCampSchema } from '@/features/crm/clients/schemas'
import { SLOT_OPTIONS } from '@/features/crm/clients/clients.mock'
import type { BookCampInput } from '@/features/crm/clients/clients.service'

interface BookCampDialogProps {
  client: Client
  division: Division
  projects: ClientProject[]
  mrs: ClientMr[]
  /** Preselects the MR when opened from the MR row's "Book camp" button */
  initialMrId: string
  onClose: () => void
  onSave: (input: BookCampInput) => void | Promise<void>
}

const FieldLabel = ({ children }: { children: string }) => (
  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
    {children}
  </Label>
)

const BookCampDialog = ({ client, division, projects, mrs, initialMrId, onClose, onSave }: BookCampDialogProps) => {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [mrId, setMrId] = useState(initialMrId)
  const [type, setType] = useState<ClientProjectType>('Screening')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [city, setCity] = useState(client.city)
  const [patientsExpected, setPatientsExpected] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const result = bookCampSchema.safeParse({ projectId, mrId, type, date, slot, city, patientsExpected, notes })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please review the camp booking fields.')
      return
    }
    const mr = mrs.find((m) => m.id === result.data.mrId)
    await onSave({
      clientId: client.id,
      divisionId: division.id,
      projectId: result.data.projectId,
      mrId: result.data.mrId,
      mrName: mr?.name ?? '',
      type: result.data.type,
      date: result.data.date,
      slot: result.data.slot,
      city: result.data.city || client.city,
      state: client.state,
      patientsExpected: result.data.patientsExpected,
      notes: result.data.notes,
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Book camp</DialogTitle>
        </DialogHeader>

        <div>
          <FieldLabel>Project *</FieldLabel>
          <Select value={projectId} onValueChange={(v) => { setProjectId(v as string); setError(null) }}>
            <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select project" /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.id} · {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <FieldLabel>Medical representative *</FieldLabel>
          <Select value={mrId} onValueChange={(v) => { setMrId(v as string); setError(null) }}>
            <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select MR" /></SelectTrigger>
            <SelectContent>
              {mrs.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Camp type</FieldLabel>
            <Select value={type} onValueChange={(v) => setType(v as ClientProjectType)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Screening">Screening</SelectItem>
                <SelectItem value="Diet">Diet</SelectItem>
                <SelectItem value="Lab">Lab</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>City</FieldLabel>
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="text-[13px]" />
          </div>
          <div>
            <FieldLabel>Camp date *</FieldLabel>
            <DatePicker value={date} onChange={(iso) => { setDate(iso); setError(null) }} placeholder="Future date" className="w-full text-[13px]" />
          </div>
          <div>
            <FieldLabel>Slot *</FieldLabel>
            <Select value={slot} onValueChange={(v) => { setSlot(v as string); setError(null) }}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select slot" /></SelectTrigger>
              <SelectContent>
                {SLOT_OPTIONS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <FieldLabel>Patients expected</FieldLabel>
            <Input type="number" min={0} value={patientsExpected} onChange={(e) => setPatientsExpected(e.target.value)} placeholder="0" className="text-[13px]" />
          </div>
        </div>

        <div>
          <FieldLabel>Notes</FieldLabel>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-[13px]" />
        </div>

        {error && <p className="text-[11px] text-danger">{error}</p>}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Book camp</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BookCampDialog
