import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import type { Doctor } from '@/features/doctors/doctors.types'
import type { TeleConsult, TeleMode } from '@/features/doctors/components/tabs/TeleConsultTab.types'

const TODAY_ISO = new Date().toISOString().slice(0, 10)

interface TeleBookingModalProps {
  open: boolean
  doctors: Doctor[]
  onClose: () => void
  onBook: (rec: Omit<TeleConsult, 'id' | 'status'>) => void
}

// Outer shell only mounts the form while open — the form's own key resets
// its state fresh on every open instead of syncing via useEffect.
const TeleBookingModal = ({ open, doctors, onClose, onBook }: TeleBookingModalProps) => {
  if (!open) return null
  return <TeleBookingModalForm key={doctors.length} doctors={doctors} onClose={onClose} onBook={onBook} />
}

interface TeleBookingModalFormProps {
  doctors: Doctor[]
  onClose: () => void
  onBook: (rec: Omit<TeleConsult, 'id' | 'status'>) => void
}

const TeleBookingModalForm = ({ doctors, onClose, onBook }: TeleBookingModalFormProps) => {
  const [patientName, setPatientName] = useState('')
  const [phone, setPhone] = useState('')
  const [condition, setCondition] = useState('')
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? '')
  const [date, setDate] = useState(TODAY_ISO)
  const [time, setTime] = useState('11:00')
  const [mode, setMode] = useState<TeleMode>('Video')
  const [referredFrom, setReferredFrom] = useState('')

  const handleSave = () => {
    if (!patientName.trim()) { toast.error('Patient name is required'); return }
    if (!doctorId) { toast.error('Pick a doctor'); return }
    if (!date) { toast.error('Pick a date'); return }
    if (!time) { toast.error('Pick a time'); return }
    onBook({ patientName, phone, condition, referredFrom: referredFrom || undefined, doctorId, date, time, mode })
    toast.success('Tele-consult booked')
    onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book tele-consult</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Patient name *</label>
            <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Condition</label>
            <Input value={condition} onChange={(e) => setCondition(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Doctor *</label>
            <Select value={doctorId} onValueChange={(v) => setDoctorId(v as string)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select doctor" /></SelectTrigger>
              <SelectContent>
                {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} · {d.specialty}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Date *</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Time *</label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Mode</label>
            <Select value={mode} onValueChange={(v) => setMode(v as TeleMode)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Video">Video</SelectItem>
                <SelectItem value="Phone">Phone</SelectItem>
                <SelectItem value="Chat">Chat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Referred from camp</label>
            <Input value={referredFrom} onChange={(e) => setReferredFrom(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Book</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TeleBookingModal
