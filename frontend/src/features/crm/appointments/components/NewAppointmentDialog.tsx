import { useState } from 'react'
import { FiUserPlus } from 'react-icons/fi'
import type { AppointmentType, AppointmentMode } from '@/types/appointment.types'
import { APPOINTMENT_TYPE_LABEL, APPOINTMENT_MODE_LABEL } from '@/types/appointment.types'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDivisions } from '@/features/crm/hooks/useDivisions'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { useCreateContact } from '@/features/contacts/hooks/useCreateContact'
import { useCreateAppointment } from '@/features/crm/appointments/hooks/useCreateAppointment'
import { toast } from '@/components/ui/sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DatePicker from '@/components/ui/DatePicker'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import InternalMembersPicker from '@/features/crm/appointments/components/InternalMembersPicker'
import LeadIdPicker from '@/features/crm/appointments/components/LeadIdPicker'

// Sentinel value for the inline "+ Add new contact" option inside the
// Contact person <Select> — a real contact id is never this string, so it's
// safe to use as a Select item value (base-ui's Select requires a non-empty
// string value, ruling out '').
const ADD_NEW_CONTACT_VALUE = '__add_new_contact__'

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
  const [leadLabel, setLeadLabel] = useState('')
  const [agendaPublic, setAgendaPublic] = useState('')
  const [agendaPrivate, setAgendaPrivate] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [error, setError] = useState('')

  // Inline "add new contact" — mirrors the prototype's New Meeting form,
  // which lets the user create a contact for the chosen company without
  // leaving the appointment modal (sales-calendar.js's inline
  // "➕ Add new contact…" option + name/designation sub-form). Kept
  // deliberately minimal (name + designation) — a fuller edit (email/phone/
  // location/type) is always available afterward via the standalone
  // Contacts page.
  const [addingContact, setAddingContact] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [newContactDesignation, setNewContactDesignation] = useState('')
  const [newContactError, setNewContactError] = useState('')
  // Names the just-created contact locally so the Select shows it
  // immediately — useContacts()'s query invalidation is async, so relying
  // solely on `contacts.find(...)` leaves the trigger showing the
  // "Select contact..." placeholder for a beat (or longer, if the refetch
  // is still in flight) right after a successful inline creation, even
  // though contactPersonId is already correctly set underneath.
  const [justCreatedContact, setJustCreatedContact] = useState<{ id: string; name: string } | null>(null)

  // limit: '20' — this Company picker should list every active tenant, not
  // just the backend's default first-10 (requestHandler.ts). Same class of
  // truncation bug as the platform-tenant-resolution fix elsewhere (see
  // accessManagement.constants.ts's PLATFORM_TENANT_FETCH_LIMIT) — here it's
  // "some real companies silently missing from the Company dropdown" rather
  // than "one specific tenant unreachable," but the same root cause.
  const { data: tenantData, isLoading: tenantsLoading, isError: tenantsErrored } = useTenants({ status: 'active', limit: '20' })
  const tenants = tenantData?.data?.items ?? []

  const { data: divisionData, isLoading: divisionsLoading, isError: divisionsErrored } =
    useDivisions({ tenantId: tenantId || undefined }, !!tenantId)
  const divisions = tenantId ? divisionData?.data?.items ?? [] : []

  // `enabled: !!tenantId` — NOT `{ limit: '0' }` (the prior approach, fixed
  // 2026-08-03): Mongoose's `.find().limit(0)` means "no limit at all," not
  // "return nothing" — `limit: '0'` was silently fetching every contact in
  // the system, unscoped, before a company was even picked. Confirmed live:
  // GET /contacts?limit=0 returned all 16+ real contacts, not zero.
  const { data: contactData, isLoading: contactsLoading, isError: contactsErrored } =
    useContacts({ tenant: tenantId || undefined, status: 'active' }, { enabled: !!tenantId })
  const contacts = tenantId ? contactData?.data?.items ?? [] : []

  const createAppointment = useCreateAppointment()
  const createContact = useCreateContact()

  const handleContactSelect = (value: string | null) => {
    if (value === ADD_NEW_CONTACT_VALUE) {
      setNewContactError('')
      setNewContactName('')
      setNewContactDesignation('')
      setAddingContact(true)
      return
    }
    setContactPersonId(value ?? '')
  }

  const handleCreateContact = async () => {
    if (!newContactName.trim()) return setNewContactError('Name is required')
    try {
      const created = await createContact.mutateAsync({
        tenant: tenantId,
        name: newContactName.trim(),
        designation: newContactDesignation.trim() || undefined,
      })
      if (!created.data) {
        setNewContactError('Contact created but the response was empty — try selecting it from the list.')
        return
      }
      toast.success('Contact added')
      setJustCreatedContact({ id: created.data.id, name: created.data.name })
      setContactPersonId(created.data.id)
      setAddingContact(false)
    } catch (err: any) {
      setNewContactError(err?.response?.data?.message || 'Could not add contact — try again.')
    }
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
    setAgendaPublic('')
    setAgendaPrivate('')
    setNextSteps('')
    setError('')
    setAddingContact(false)
    setNewContactName('')
    setNewContactDesignation('')
    setNewContactError('')
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
              <Label className={labelClasses} style={labelStyle}>Linked lead *</Label>
              <LeadIdPicker value={leadId} label={leadLabel} onChange={(id, label) => { setLeadId(id); setLeadLabel(label) }} />
            </div>
          )}

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
              <Select key={divisionId || 'empty'} value={divisionId || undefined} onValueChange={(v) => setDivisionId(v ?? '')} disabled={!tenantId}>
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
              {/* key forces a remount once a real value exists — base-ui's
                  Select decides controlled-vs-uncontrolled on its very first
                  render and never revisits it (same fix already used by
                  RoleTypeDetailPage.tsx's Status select); without this,
                  setting contactPersonId programmatically (e.g. right after
                  the inline "Add new contact" flow) leaves the trigger
                  permanently showing "Select contact..." even though the
                  value is genuinely set underneath. */}
              <Select key={contactPersonId || 'empty'} value={contactPersonId || undefined} onValueChange={handleContactSelect} disabled={!tenantId}>
                <SelectTrigger className="w-full text-[13px]">
                  <SelectValue placeholder={!tenantId ? 'Select a company first' : contactsLoading ? 'Loading...' : 'Select contact...'}>
                    {(v: string) =>
                      contacts.find((c) => c.id === v)?.name ??
                      (justCreatedContact?.id === v ? justCreatedContact.name : null) ??
                      (contactsLoading ? 'Loading...' : 'Select contact...')
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  {tenantId && (
                    <SelectItem value={ADD_NEW_CONTACT_VALUE}>
                      <span className="flex items-center gap-1.5" style={{ color: 'var(--qms-brand)' }}>
                        <FiUserPlus size={12} /> Add new contact…
                      </span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {contactsErrored && <p className="text-[11px] mt-1 text-danger">Couldn't load contacts.</p>}
              {!contactsErrored && !contactsLoading && tenantId && contacts.length === 0 && !addingContact && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>This company has no contacts yet — add one below.</p>
              )}
              {addingContact && (
                <div className="mt-2 p-2.5 rounded-lg border space-y-2" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
                  <Input
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Contact name *"
                    className="text-[13px]"
                  />
                  <Input
                    value={newContactDesignation}
                    onChange={(e) => setNewContactDesignation(e.target.value)}
                    placeholder="Designation (optional)"
                    className="text-[13px]"
                  />
                  {newContactError && <p className="text-[11px] font-semibold text-danger">{newContactError}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" type="button" onClick={handleCreateContact} disabled={createContact.isPending}>
                      {createContact.isPending ? 'Saving...' : 'Save contact'}
                    </Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => setAddingContact(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

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
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="text-[13px]" />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>End</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="text-[13px]" />
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
