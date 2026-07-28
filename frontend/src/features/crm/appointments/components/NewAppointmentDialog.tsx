import { useState } from 'react'
import type { AppointmentType, AppointmentMode } from '@/types/appointment.types'
import { APPOINTMENT_TYPE_LABEL } from '@/types/appointment.types'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDivisions } from '@/features/crm/hooks/useDivisions'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { useCreateAppointment } from '@/features/crm/appointments/hooks/useCreateAppointment'
import { toast } from '@/components/ui/sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import InternalMembersPicker from '@/features/crm/appointments/components/InternalMembersPicker'

const APPOINTMENT_TYPES: AppointmentType[] = ['new', 'follow-up', 'payment', 'spot']

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

interface SelectedMember {
  roleId: string
  label: string
}

interface NewAppointmentDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
  prefill?: { date: string; hour: number }
}

// Mirrors the prototype's New Meeting modal layout order (sales-calendar.js's
// renderNewMeeting): Type cards -> Follow-up lead reference (conditional) ->
// Account section (Company -> Division -> Contact, cascading, matching
// WizardStep1.tsx's exact pattern) -> Mode -> Internal team invitees -> Time
// -> Agenda. Per explicit decision (2026-07-27, documented in PROGRESS.md):
// no "peer overlay"/outcome/reschedule-history concepts here since none have
// a real backend field; the Leads-view and Weekly-planning-panel features
// are out of scope entirely.
const NewAppointmentDialog = ({ open, onClose, onCreated, prefill }: NewAppointmentDialogProps) => {
  const [type, setType] = useState<AppointmentType>('new')
  const [tenantId, setTenantId] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const [contactPersonId, setContactPersonId] = useState('')
  const [mode, setMode] = useState<AppointmentMode>('online')
  const [members, setMembers] = useState<SelectedMember[]>([])
  const [date, setDate] = useState(prefill?.date ?? new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState(prefill ? `${String(prefill.hour).padStart(2, '0')}:00` : '10:00')
  const [endTime, setEndTime] = useState(prefill ? `${String(prefill.hour + 1).padStart(2, '0')}:00` : '11:00')
  const [destinationLink, setDestinationLink] = useState('')
  const [leadId, setLeadId] = useState('')
  const [agendaPublic, setAgendaPublic] = useState('')
  const [agendaPrivate, setAgendaPrivate] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [error, setError] = useState('')

  const { data: tenantData, isLoading: tenantsLoading, isError: tenantsErrored } = useTenants({ status: 'active' })
  const tenants = tenantData?.data?.items ?? []

  const { data: divisionData, isLoading: divisionsLoading, isError: divisionsErrored } =
    useDivisions(tenantId ? { tenantId } : { tenantId: undefined })
  const divisions = tenantId ? divisionData?.data?.items ?? [] : []

  const { data: contactData, isLoading: contactsLoading, isError: contactsErrored } =
    useContacts(tenantId ? { tenant: tenantId, status: 'active' } : { limit: '0' })
  const contacts = tenantId ? contactData?.data?.items ?? [] : []

  const createAppointment = useCreateAppointment()

  const reset = () => {
    setType('new')
    setTenantId('')
    setDivisionId('')
    setContactPersonId('')
    setMode('online')
    setMembers([])
    setDate(new Date().toISOString().slice(0, 10))
    setStartTime('10:00')
    setEndTime('11:00')
    setDestinationLink('')
    setLeadId('')
    setAgendaPublic('')
    setAgendaPrivate('')
    setNextSteps('')
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const selectTenant = (id: string) => {
    setTenantId(id)
    setDivisionId('')
    setContactPersonId('')
  }

  const handleSave = async () => {
    if (!tenantId) return setError('Select a company')
    if (!divisionId) return setError('Select a division')
    if (!contactPersonId) return setError('Select a contact person')
    if (!agendaPublic.trim()) return setError('Public agenda is required')
    if (type === 'follow-up' && !leadId.trim()) return setError('Linked lead id is required for follow-up appointments')
    const startAt = new Date(`${date}T${startTime}:00`)
    const endAt = new Date(`${date}T${endTime}:00`)
    if (endAt.getTime() <= startAt.getTime()) return setError('End time must be after start time')

    setError('')
    try {
      const created = await createAppointment.mutateAsync({
        tenant: tenantId,
        division: divisionId,
        type,
        contactPerson: contactPersonId,
        internalMembers: members.map((m) => m.roleId),
        lead: leadId.trim() || undefined,
        mode,
        destinationLink: destinationLink.trim() || undefined,
        startTime: startAt.toISOString(),
        endTime: endAt.toISOString(),
        agenda: { public: agendaPublic.trim(), private: agendaPrivate.trim() || undefined },
        nextSteps: nextSteps.trim() || undefined,
      })
      if (!created.data) {
        setError('Appointment created but the response was empty — refresh to see it.')
        return
      }
      toast.success('Appointment scheduled')
      reset()
      onCreated(created.data.id)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not schedule the appointment — try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className={labelClasses} style={labelStyle}>Type</Label>
            <div className="flex flex-wrap gap-1.5">
              {APPOINTMENT_TYPES.map((t) => {
                const active = type === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className="rounded-xl border px-3 py-2 text-left transition-colors"
                    style={
                      active
                        ? { borderColor: 'var(--qms-brand)', background: 'color-mix(in oklch, var(--qms-brand), transparent 92%)' }
                        : { borderColor: 'var(--qms-border)' }
                    }
                  >
                    <div className="text-[12px] font-bold" style={{ color: active ? 'var(--qms-brand)' : 'var(--qms-text)' }}>
                      {APPOINTMENT_TYPE_LABEL[t]}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {type === 'follow-up' && (
            <div>
              <Label className={labelClasses} style={labelStyle}>Linked lead ID *</Label>
              <Input value={leadId} onChange={(e) => setLeadId(e.target.value)} className="text-[13px]" placeholder="Lead ObjectId" />
            </div>
          )}

          <div>
            <Label className={labelClasses} style={labelStyle}>Company *</Label>
            <Select value={tenantId || undefined} onValueChange={(v) => selectTenant(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]">
                <SelectValue placeholder={tenantsLoading ? 'Loading...' : 'Select company...'}>
                  {(v: string) => tenants.find((t) => t.id === v)?.name ?? (tenantsLoading ? 'Loading...' : 'Select company...')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {tenantsErrored && <p className="text-[11px] mt-1 text-danger">Couldn't load companies — try again.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>Division *</Label>
              <Select value={divisionId || undefined} onValueChange={(v) => setDivisionId(v ?? '')} disabled={!tenantId}>
                <SelectTrigger className="w-full text-[13px]">
                  <SelectValue placeholder={!tenantId ? 'Select a company first' : divisionsLoading ? 'Loading...' : 'Select division...'}>
                    {(v: string) => divisions.find((d) => d.id === v)?.name ?? (divisionsLoading ? 'Loading...' : 'Select division...')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {divisionsErrored && <p className="text-[11px] mt-1 text-danger">Couldn't load divisions.</p>}
              {!divisionsErrored && !divisionsLoading && tenantId && divisions.length === 0 && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>This company has no divisions yet.</p>
              )}
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Contact person *</Label>
              <Select value={contactPersonId || undefined} onValueChange={(v) => setContactPersonId(v ?? '')} disabled={!tenantId}>
                <SelectTrigger className="w-full text-[13px]">
                  <SelectValue placeholder={!tenantId ? 'Select a company first' : contactsLoading ? 'Loading...' : 'Select contact...'}>
                    {(v: string) => contacts.find((c) => c.id === v)?.name ?? (contactsLoading ? 'Loading...' : 'Select contact...')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {contactsErrored && <p className="text-[11px] mt-1 text-danger">Couldn't load contacts.</p>}
              {!contactsErrored && !contactsLoading && tenantId && contacts.length === 0 && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>This company has no contacts yet.</p>
              )}
            </div>
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Mode</Label>
            <div className="flex gap-1.5">
              {(['online', 'offline', 'call'] as AppointmentMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
                  style={
                    mode === m
                      ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                      : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }
                  }
                >
                  {m === 'online' ? 'Online' : m === 'offline' ? 'In person' : 'Call'}
                </button>
              ))}
            </div>
          </div>

          {mode !== 'call' && (
            <div>
              <Label className={labelClasses} style={labelStyle}>Meeting/map link</Label>
              <Input value={destinationLink} onChange={(e) => setDestinationLink(e.target.value)} className="text-[13px]" placeholder="https://meet.google.com/..." />
            </div>
          )}

          <div>
            <Label className={labelClasses} style={labelStyle}>Additional persons — QMS side</Label>
            <InternalMembersPicker selected={members} onChange={setMembers} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-[13px]" />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Start *</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="text-[13px]" />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>End</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="text-[13px]" />
            </div>
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Public agenda *</Label>
            <Textarea value={agendaPublic} onChange={(e) => setAgendaPublic(e.target.value)} rows={2} className="text-[13px]" />
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Private notes</Label>
            <Textarea value={agendaPrivate} onChange={(e) => setAgendaPrivate(e.target.value)} rows={2} className="text-[13px]" placeholder="Internal only" />
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
            disabled={createAppointment.isPending}
            className="font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            {createAppointment.isPending ? 'Scheduling...' : 'Schedule appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default NewAppointmentDialog
