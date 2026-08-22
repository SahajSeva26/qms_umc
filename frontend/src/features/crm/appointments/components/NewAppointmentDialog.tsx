import { useState } from 'react'
import { FiUserPlus } from 'react-icons/fi'
import type { AppointmentType, AppointmentMode } from '@/features/crm/appointments/appointment.types'
import { APPOINTMENT_TYPE_LABEL, APPOINTMENT_MODE_LABEL } from '@/features/crm/appointments/appointment.types'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDivisions } from '@/features/crm/divisions/hooks/useDivisions'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { useCreateAppointment } from '@/features/crm/appointments/hooks/useCreateAppointment'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DatePicker from '@/components/ui/DatePicker'
import { TimePicker } from '@/components/ui/TimePicker'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import InternalMembersPicker from '@/features/crm/appointments/components/InternalMembersPicker'
import LeadIdPicker from '@/features/crm/appointments/components/LeadIdPicker'
import LinkedMeetingPicker from '@/features/crm/appointments/components/LinkedMeetingPicker'
import EditContactModal from '@/features/contacts/components/EditContactModal'

// Sentinel for the inline "+ Add new contact" option — never a real contact id,
// and non-empty as base-ui's Select requires.
const ADD_NEW_CONTACT_VALUE = '__add_new_contact__'

const APPOINTMENT_TYPES: AppointmentType[] = ['new', 'follow-up', 'payment', 'spot']

// Both are 'HH:mm' on the same calendar day, so a plain minute-of-day diff suffices.
function formatDuration(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const totalMinutes = eh * 60 + em - (sh * 60 + sm)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} hr`
  return `${hours} hr ${minutes} min`
}

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
  const [leadLabel, setLeadLabel] = useState('')
  const [parentId, setParentId] = useState('')
  const [parentLabel, setParentLabel] = useState('')
  const [agendaPublic, setAgendaPublic] = useState('')
  const [agendaPrivate, setAgendaPrivate] = useState('')
  const [error, setError] = useState('')

  const [addingContact, setAddingContact] = useState(false)
  // Shows the new contact's name immediately, ahead of useContacts()'s invalidation lag.
  const [justCreatedContact, setJustCreatedContact] = useState<{ id: string; name: string } | null>(null)

  const { data: tenantData, isLoading: tenantsLoading, isError: tenantsErrored } = useTenants({ status: 'active', limit: '20' }, open)
  const tenants = tenantData?.data?.items ?? []

  const { data: divisionData, isLoading: divisionsLoading, isError: divisionsErrored } =
    useDivisions({ tenant: tenantId || undefined }, !!tenantId)
  const divisions = tenantId ? divisionData?.data?.items ?? [] : []

  // Scoped by division, not tenant — Contact.division is required for customer-type contacts.
  const { data: contactData, isLoading: contactsLoading, isError: contactsErrored } =
    useContacts({ division: divisionId || undefined, status: 'active' }, { enabled: !!divisionId })
  const contacts = divisionId ? contactData?.data?.items ?? [] : []

  const createAppointment = useCreateAppointment()

  const handleContactSelect = (value: string | null) => {
    if (value === ADD_NEW_CONTACT_VALUE) {
      setAddingContact(true)
      return
    }
    setContactPersonId(value ?? '')
  }

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
    setLeadLabel('')
    setParentId('')
    setParentLabel('')
    setAgendaPublic('')
    setAgendaPrivate('')
    setError('')
    setAddingContact(false)
    setJustCreatedContact(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const selectTenant = (id: string) => {
    setTenantId(id)
    setDivisionId('')
    setContactPersonId('')
    setAddingContact(false)
    setJustCreatedContact(null)
    setParentId('')
    setParentLabel('')
  }

  const handleSave = async () => {
    if (!tenantId) return setError('Select a company')
    if (!divisionId) return setError('Select a division')
    if (!contactPersonId) return setError('Select a contact person')
    if (!agendaPublic.trim()) return setError('Public agenda is required')
    if (type === 'follow-up' && !leadId.trim() && !parentId.trim()) return setError('Follow-up appointments need a linked lead or a linked meeting')
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
        parent: parentId.trim() || undefined,
        mode,
        destinationLink: destinationLink.trim() || undefined,
        startTime: startAt.toISOString(),
        endTime: endAt.toISOString(),
        agenda: { public: agendaPublic.trim(), private: agendaPrivate.trim() || undefined },
      })
      if (!created.data) {
        setError('Appointment created but the response was empty — refresh to see it.')
        return
      }
      toast.success('Appointment scheduled')
      reset()
      onCreated(created.data.id)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not schedule the appointment — try again.'))
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

          <div>
            <Label className={labelClasses} style={labelStyle}>Company *</Label>
            <Select key={tenantId || 'empty'} value={tenantId || undefined} onValueChange={(v) => selectTenant(v ?? '')}>
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
              <Select
                key={divisionId || 'empty'}
                value={divisionId || undefined}
                onValueChange={(v) => {
                  setDivisionId(v ?? '')
                  setContactPersonId('')
                  setAddingContact(false)
                  setJustCreatedContact(null)
                  setParentId('')
                  setParentLabel('')
                }}
                disabled={!tenantId}
              >
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
              {/* key forces a remount when set programmatically, else the Select keeps showing the placeholder. */}
              <Select key={contactPersonId || 'empty'} value={contactPersonId || undefined} onValueChange={handleContactSelect} disabled={!divisionId}>
                <SelectTrigger className="w-full text-[13px]">
                  <SelectValue placeholder={!divisionId ? 'Select a division first' : contactsLoading ? 'Loading...' : 'Select contact...'}>
                    {(v: string) =>
                      contacts.find((c) => c.id === v)?.name ??
                      (justCreatedContact?.id === v ? justCreatedContact.name : null) ??
                      (contactsLoading ? 'Loading...' : 'Select contact...')
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  {divisionId && (
                    <SelectItem value={ADD_NEW_CONTACT_VALUE}>
                      <span className="flex items-center gap-1.5" style={{ color: 'var(--qms-brand)' }}>
                        <FiUserPlus size={12} /> Add new contact…
                      </span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {contactsErrored && <p className="text-[11px] mt-1 text-danger">Couldn't load contacts.</p>}
              {!contactsErrored && !contactsLoading && divisionId && contacts.length === 0 && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>This company has no contacts yet — add one above.</p>
              )}
            </div>
          </div>

          {type === 'follow-up' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClasses} style={labelStyle}>Linked lead {!parentId && '*'}</Label>
                <LeadIdPicker value={leadId} label={leadLabel} onChange={(id, label) => { setLeadId(id); setLeadLabel(label) }} />
              </div>
              <div>
                <Label className={labelClasses} style={labelStyle}>Linked meeting {!leadId && '*'}</Label>
                <LinkedMeetingPicker
                  value={parentId}
                  label={parentLabel}
                  divisionId={divisionId}
                  onChange={(id, label) => { setParentId(id); setParentLabel(label) }}
                />
              </div>
              {!leadId && !parentId && (
                <p className="text-[11px] col-span-2" style={{ color: 'var(--qms-text-muted)' }}>
                  Follow-up appointments need either a linked lead or a linked meeting.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as AppointmentMode)}>
                <SelectTrigger className="w-full text-[13px]">
                  <SelectValue>{(v: string) => APPOINTMENT_MODE_LABEL[v as AppointmentMode]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(['online', 'offline', 'call'] as AppointmentMode[]).map((m) => (
                    <SelectItem key={m} value={m}>{APPOINTMENT_MODE_LABEL[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode !== 'call' && (
              <div>
                <Label className={labelClasses} style={labelStyle}>{mode === 'online' ? 'Meeting link' : 'Map link'}</Label>
                <Input
                  value={destinationLink}
                  onChange={(e) => setDestinationLink(e.target.value)}
                  className="text-[13px]"
                  placeholder={mode === 'online' ? 'https://meet.google.com/...' : 'https://maps.google.com/...'}
                />
              </div>
            )}
          </div>

          <div>
            <Label className={labelClasses} style={labelStyle}>Additional persons — QMS side</Label>
            <InternalMembersPicker selected={members} onChange={setMembers} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>Date *</Label>
              <DatePicker value={date} onChange={setDate} className="w-full text-[13px]" />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Start *</Label>
              <TimePicker value={startTime} onChange={setStartTime} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className={`${labelClasses} mb-0`} style={labelStyle}>End</Label>
                {endTime && startTime && endTime > startTime && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'color-mix(in oklch, var(--qms-brand), transparent 88%)', color: 'var(--qms-brand)' }}
                  >
                    {formatDuration(startTime, endTime)}
                  </span>
                )}
              </div>
              <TimePicker value={endTime} onChange={setEndTime} />
              {endTime && startTime && endTime <= startTime && (
                <p className="text-[11px] mt-1 text-danger">End time must be after start time</p>
              )}
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

      <EditContactModal
        open={addingContact}
        contact={null}
        onClose={() => setAddingContact(false)}
        fixedTenantId={tenantId}
        fixedDivisionId={divisionId}
        onCreated={(created) => {
          setJustCreatedContact(created)
          setContactPersonId(created.id)
        }}
      />
    </Dialog>
  )
}

export default NewAppointmentDialog
