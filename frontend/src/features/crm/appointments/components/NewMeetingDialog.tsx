import { useState } from 'react'
import type { Meeting, MeetingMode, MeetingType } from '@/types/meeting.types'
import { MEETING_TYPE_META } from '@/types/meeting.types'
import { newMeetingSchema } from '@/features/crm/appointments/schemas'
import { OWNERS, PHARMA_COMPANIES } from '@/features/crm/appointments/appointments.mock'
import { TIME_OPTIONS } from '@/features/crm/appointments/appointments.utils'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import DatePicker from '@/components/ui/DatePicker'

const MEETING_TYPES: MeetingType[] = ['NEW', 'FOLLOWUP', 'PAYMENT', 'SPOT']

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

interface NewMeetingDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (meeting: Meeting) => void
  meId: string
  prefill?: { date: string; hour: number }
}

function nextMeetingNo(): string {
  const seq = Number(localStorage.getItem('qms.cal.meetingSeq') ?? '0') + 1
  try {
    localStorage.setItem('qms.cal.meetingSeq', String(seq))
  } catch {
    // demo counter only
  }
  return `MTG-${String(seq).padStart(4, '0')}`
}

const NewMeetingDialog = ({ open, onClose, onCreate, meId, prefill }: NewMeetingDialogProps) => {
  const me = OWNERS.find((o) => o.id === meId) ?? OWNERS[0]

  const [type, setType] = useState<MeetingType>('NEW')
  const [pharmaCompanyId, setPharmaCompanyId] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [city, setCity] = useState('')
  const [location, setLocation] = useState('')
  const [modeOfMeeting, setModeOfMeeting] = useState<MeetingMode>('IN_PERSON')
  const [date, setDate] = useState(prefill?.date ?? new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState(prefill ? `${String(prefill.hour).padStart(2, '0')}:00` : '10:00')
  const [endTime, setEndTime] = useState(prefill ? `${String(prefill.hour + 1).padStart(2, '0')}:00` : '11:00')
  const [agendaPublic, setAgendaPublic] = useState('')
  const [agendaPrivate, setAgendaPrivate] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [linkedLeadId, setLinkedLeadId] = useState('')
  const [error, setError] = useState('')

  const reset = () => {
    setType('NEW')
    setPharmaCompanyId('')
    setContactName('')
    setContactRole('')
    setCity('')
    setLocation('')
    setModeOfMeeting('IN_PERSON')
    setDate(new Date().toISOString().slice(0, 10))
    setStartTime('10:00')
    setEndTime('11:00')
    setAgendaPublic('')
    setAgendaPrivate('')
    setNextSteps('')
    setLinkedLeadId('')
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSave = () => {
    const result = newMeetingSchema.safeParse({
      type,
      pharmaCompanyId,
      contactName,
      contactRole,
      city,
      location,
      modeOfMeeting,
      date,
      startTime,
      endTime,
      agendaPublic,
      agendaPrivate,
      nextSteps,
      linkedLeadId,
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please review the form')
      return
    }

    const pharma = PHARMA_COMPANIES.find((p) => p.id === result.data.pharmaCompanyId)
    const startAt = new Date(`${result.data.date}T${result.data.startTime}:00`).toISOString()
    const endAt = new Date(`${result.data.date}T${result.data.endTime}:00`).toISOString()
    const now = new Date().toISOString()

    const meeting: Meeting = {
      id: `mt-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      meetingNo: nextMeetingNo(),
      ownerId: me.id,
      ownerName: me.name,
      ownerTone: me.tone,
      type: result.data.type,
      status: 'PLANNED',
      pharmaCompanyId: result.data.pharmaCompanyId,
      pharmaName: pharma?.name ?? result.data.pharmaCompanyId,
      contactName: result.data.contactName,
      contactRole: result.data.contactRole?.trim() || undefined,
      city: result.data.city?.trim() || undefined,
      location: result.data.location?.trim() || undefined,
      modeOfMeeting: result.data.modeOfMeeting,
      startAt,
      endAt,
      agendaPublic: result.data.agendaPublic,
      agendaPrivate: result.data.agendaPrivate?.trim() || undefined,
      nextSteps: result.data.nextSteps?.trim() || undefined,
      linkedLeadId: result.data.linkedLeadId?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    }

    onCreate(meeting)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New meeting</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className={labelClasses} style={labelStyle}>Type</Label>
            <div className="flex flex-wrap gap-1.5">
              {MEETING_TYPES.map((t) => {
                const meta = MEETING_TYPE_META[t]
                const active = type === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className="rounded-xl border px-3 py-2 text-left transition-colors"
                    style={
                      active
                        ? { borderColor: meta.color, background: `${meta.color}14` }
                        : { borderColor: 'var(--qms-border)' }
                    }
                  >
                    <div className="text-[12px] font-bold" style={{ color: active ? meta.color : 'var(--qms-text)' }}>
                      {meta.name}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {type === 'FOLLOWUP' && (
            <div>
              <Label className={labelClasses} style={labelStyle}>Linked lead ID *</Label>
              <Input value={linkedLeadId} onChange={(e) => setLinkedLeadId(e.target.value)} className="text-[13px]" placeholder="L-2415" />
            </div>
          )}

          <div>
            <Label className={labelClasses} style={labelStyle}>Pharma company *</Label>
            <Select value={pharmaCompanyId} onValueChange={(v) => setPharmaCompanyId(v as string)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select company..." /></SelectTrigger>
              <SelectContent>
                {PHARMA_COMPANIES.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>Contact name *</Label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="text-[13px]" placeholder="Dr. Name" />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Contact role</Label>
              <Input value={contactRole} onChange={(e) => setContactRole(e.target.value)} className="text-[13px]" placeholder="Brand Mgr" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="text-[13px]" />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="text-[13px]" placeholder="Office / Online" />
            </div>
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Mode</Label>
            <div className="flex gap-1.5">
              {(['IN_PERSON', 'VIRTUAL'] as MeetingMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setModeOfMeeting(mode)}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
                  style={
                    modeOfMeeting === mode
                      ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                      : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }
                  }
                >
                  {mode === 'IN_PERSON' ? 'In person' : 'Virtual'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>Date *</Label>
              <DatePicker value={date} onChange={setDate} className="w-full text-[13px]" />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Start *</Label>
              <Select value={startTime} onValueChange={(v) => setStartTime(v as string)}>
                <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>End *</Label>
              <Select value={endTime} onValueChange={(v) => setEndTime(v as string)}>
                <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Public agenda *</Label>
            <Textarea value={agendaPublic} onChange={(e) => setAgendaPublic(e.target.value)} rows={2} className="text-[13px]" />
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Private agenda</Label>
            <Textarea value={agendaPrivate} onChange={(e) => setAgendaPrivate(e.target.value)} rows={2} className="text-[13px]" placeholder="Hidden from peer overlay" />
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Next steps</Label>
            <Input value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} className="text-[13px]" />
          </div>

          {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            className="font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            Create meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default NewMeetingDialog
