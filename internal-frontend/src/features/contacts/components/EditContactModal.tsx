import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { useCreateContact } from '@/features/contacts/hooks/useCreateContact'
import { useUpdateContact } from '@/features/contacts/hooks/useUpdateContact'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDivisions } from '@/features/crm/divisions/hooks/useDivisions'
import { usePermission } from '@/hooks/usePermission'
import { createContactSchema, updateContactSchema } from '@/features/contacts/schemas/contact.schemas'
import { CONTACT_DEPARTMENTS, CONTACT_DEPARTMENT_LABEL, DESIGNATIONS_BY_DEPARTMENT, type ContactDepartment } from '@/features/contacts/contact.constants'
import { getApiErrorMessage } from '@/utils/apiError'
import type { ContactEntity, ContactType, ContactStatus } from '@/types/contact.types'

const TYPE_OPTIONS: { value: ContactType; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'platform', label: 'Platform (QMS internal)' },
]

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const DEPARTMENT_OPTIONS = Object.values(CONTACT_DEPARTMENTS)
// Sentinel for the "—" (none) option — base-ui Select values must be non-empty/unique.
const NONE = '__qms_none__'

interface ContactDraft {
  name: string
  department: string
  designation: string
  email: string
  phone: string
  location: string
  type: ContactType
  status: ContactStatus
}

const emptyDraft: ContactDraft = { name: '', department: '', designation: '', email: '', phone: '', location: '', type: 'customer', status: 'active' }

function draftFromContact(c: ContactEntity): ContactDraft {
  return {
    name: c.name,
    department: c.department ?? '',
    designation: c.designation ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    location: c.location ?? '',
    type: c.type,
    status: c.status,
  }
}

interface EditContactModalProps {
  open: boolean
  contact: ContactEntity | null
  onClose: () => void
  // Pins create to a known tenant/division — skips both pickers below.
  fixedTenantId?: string
  fixedDivisionId?: string
  // Needed when fixedTenantId belongs to someone other than the caller, else
  // deriveCreateType() wrongly falls back to the caller's own type.
  fixedTenantType?: ContactType
  // Fires with the new contact on successful create only, so a "quick add" caller can auto-select it.
  onCreated?: (contact: { id: string; name: string }) => void
}

// Remounts the inner form keyed on contact id so draft state resets between "new" and different contacts.
const EditContactModal = ({ open, contact, onClose, fixedTenantId, fixedDivisionId, fixedTenantType, onCreated }: EditContactModalProps) => {
  if (!open) return null
  return (
    <EditContactModalForm
      key={contact?.id ?? '__new__'}
      contact={contact}
      onClose={onClose}
      fixedTenantId={fixedTenantId}
      fixedDivisionId={fixedDivisionId}
      fixedTenantType={fixedTenantType}
      onCreated={onCreated}
    />
  )
}

interface EditContactModalFormProps {
  contact: ContactEntity | null
  onClose: () => void
  fixedTenantId?: string
  fixedDivisionId?: string
  fixedTenantType?: ContactType
  onCreated?: (contact: { id: string; name: string }) => void
}

const EditContactModalForm = ({ contact, onClose, fixedTenantId, fixedDivisionId, fixedTenantType, onCreated }: EditContactModalFormProps) => {
  const isEdit = !!contact
  const initialDraft = contact ? draftFromContact(contact) : emptyDraft
  const [draft, setDraft] = useState<ContactDraft>(initialDraft)
  const [tenant, setTenant] = useState(fixedTenantId ?? '')
  const setDraftField = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) => {
    setDraft((p) => ({ ...p, [key]: value }))
  }
  // Changing department invalidates a designation from the old department's list — clear it
  // whenever it no longer belongs to the newly picked department (mirrors the backend's own
  // assertDesignationMatchesDepartment pairing check).
  const handleDepartmentChange = (nextDepartment: string) => {
    setDraft((p) => {
      const stillValid = nextDepartment
        ? DESIGNATIONS_BY_DEPARTMENT[nextDepartment as ContactDepartment]?.some((d) => d.key === p.designation)
        : false
      return { ...p, department: nextDepartment, designation: stillValid ? p.designation : '' }
    })
  }

  const { sessionPermissions } = usePermission()
  const needsTenantPicker = !isEdit && !fixedTenantId && sessionPermissions?.tenantType === 'platform'
  const { data: tenantsData } = useTenants({}, needsTenantPicker)
  const tenants = tenantsData?.data?.items ?? []

  const deriveCreateType = (): ContactType => {
    if (fixedDivisionId) return 'customer'
    if (fixedTenantType) return fixedTenantType
    if (!needsTenantPicker) return (sessionPermissions?.tenantType as ContactType) ?? 'customer'
    const selected = tenants.find((t) => t.id === tenant)
    return (selected?.type as ContactType) ?? 'customer'
  }

  const effectiveTenantId = fixedTenantId || (needsTenantPicker ? tenant : sessionPermissions?.tenantId)
  const createType = deriveCreateType()
  const [division, setDivision] = useState(fixedDivisionId ?? '')
  const needsDivision = !isEdit && !fixedDivisionId && createType === 'customer'
  const { data: divisionsData, isLoading: divisionsLoading } = useDivisions(
    { tenant: effectiveTenantId || undefined },
    needsDivision && !!effectiveTenantId,
  )
  const divisions = divisionsData?.data?.items ?? []

  const createContact = useCreateContact()
  const updateContact = useUpdateContact(contact?.id ?? '')

  const handleClose = () => onClose()

  const handleSave = async () => {
    try {
      if (isEdit) {
        const result = updateContactSchema.safeParse(draft)
        if (!result.success) {
          toast.error(result.error.issues[0].message)
          return
        }
        // Compare final value to the original snapshot (not "was ever
        // touched") so a field edited then reverted is never resent.
        await updateContact.mutateAsync({
          ...(draft.name !== initialDraft.name ? { name: result.data.name } : {}),
          // The "—" dropdown option (draft value '') must map to `null`, not an omitted key or ''
          // — the backend's UpdateContactPayloadSchema only accepts a real enum key or null (never
          // ''); an omitted key leaves the old value untouched, silently no-oping the clear.
          ...(draft.designation !== initialDraft.designation ? { designation: result.data.designation || null } : {}),
          ...(draft.department !== initialDraft.department ? { department: result.data.department || null } : {}),
          ...(draft.email !== initialDraft.email ? { email: result.data.email || undefined } : {}),
          ...(draft.phone !== initialDraft.phone ? { phone: result.data.phone || undefined } : {}),
          ...(draft.location !== initialDraft.location ? { location: result.data.location || undefined } : {}),
          ...(draft.type !== initialDraft.type ? { type: result.data.type } : {}),
          ...(draft.status !== initialDraft.status ? { status: result.data.status } : {}),
        })
        toast.success('Contact updated')
      } else {
        if (needsTenantPicker && !tenant) {
          toast.error('Select a company')
          return
        }
        const result = createContactSchema.safeParse({
          ...draft,
          tenant: tenant || undefined,
          division: division || undefined,
          type: deriveCreateType(),
        })
        if (!result.success) {
          toast.error(result.error.issues[0].message)
          return
        }
        const created = await createContact.mutateAsync({
          tenant: result.data.tenant,
          division: result.data.division,
          name: result.data.name,
          designation: result.data.designation || undefined,
          department: result.data.department || undefined,
          email: result.data.email || undefined,
          phone: result.data.phone || undefined,
          location: result.data.location || undefined,
          type: result.data.type,
        })
        toast.success('Contact added')
        if (created.data) onCreated?.({ id: created.data.id, name: created.data.name })
      }
      handleClose()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save contact — try again.'))
    }
  }

  const isSaving = createContact.isPending || updateContact.isPending

  return (
    <Dialog open onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit contact' : 'Add contact'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {needsTenantPicker && (
            <div className="sm:col-span-2">
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Company</label>
              <Select
                value={tenant}
                onValueChange={(v) => {
                  setTenant(v ?? '')
                  // Reset here, in the handler that changes the tenant — not an
                  // effect reacting after the fact — so a stale division from the
                  // old company can never be submitted alongside the new one.
                  if (!fixedDivisionId) setDivision('')
                }}
              >
                <SelectTrigger className="w-full text-[13px]">
                  <SelectValue placeholder="Select company">
                    {(v: string) => tenants.find((t) => t.id === v)?.name ?? 'Select company'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {needsDivision && (
            <div className="sm:col-span-2">
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Division</label>
              <Select
                key={division || 'empty'}
                value={division || undefined}
                onValueChange={(v) => setDivision(v ?? '')}
                disabled={!effectiveTenantId}
              >
                <SelectTrigger className="w-full text-[13px]">
                  <SelectValue placeholder={!effectiveTenantId ? 'Select a company first' : divisionsLoading ? 'Loading...' : 'Select division...'}>
                    {(v: string) => divisions.find((d) => d.id === v)?.name ?? (divisionsLoading ? 'Loading...' : 'Select division...')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {effectiveTenantId && !divisionsLoading && divisions.length === 0 && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>This company has no divisions yet.</p>
              )}
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Name</label>
            <Input value={draft.name} onChange={(e) => setDraftField('name', e.target.value)} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Department</label>
            <Select value={draft.department || NONE} onValueChange={(v) => { if (!v) return; handleDepartmentChange(v === NONE ? '' : v) }}>
              <SelectTrigger className="w-full text-[13px]">
                <SelectValue>{(v: string) => (v === NONE ? 'Select department' : CONTACT_DEPARTMENT_LABEL[v as ContactDepartment] ?? v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {/* An existing contact's department may predate this fixed list — keep it selectable rather than silently drop it. */}
                {draft.department && !DEPARTMENT_OPTIONS.includes(draft.department as ContactDepartment) && (
                  <SelectItem value={draft.department}>{draft.department}</SelectItem>
                )}
                {DEPARTMENT_OPTIONS.map((d) => <SelectItem key={d} value={d}>{CONTACT_DEPARTMENT_LABEL[d]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Designation</label>
            <Select
              key={draft.department || 'empty'}
              value={draft.designation || NONE}
              onValueChange={(v) => { if (!v) return; setDraftField('designation', v === NONE ? '' : v) }}
              disabled={!draft.department}
            >
              <SelectTrigger className="w-full text-[13px]">
                <SelectValue>
                  {(v: string) => {
                    if (v === NONE) return draft.department ? 'Select designation' : 'Select a department first'
                    return DESIGNATIONS_BY_DEPARTMENT[draft.department as ContactDepartment]?.find((d) => d.key === v)?.name ?? v
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {draft.department &&
                  DESIGNATIONS_BY_DEPARTMENT[draft.department as ContactDepartment]?.map((d) => (
                    <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {isEdit && (
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Type</label>
              <Select value={draft.type} onValueChange={(v) => setDraftField('type', v as ContactType)}>
                <SelectTrigger className="w-full text-[13px]">
                  <SelectValue>{(v: string) => TYPE_OPTIONS.find((t) => t.value === v)?.label ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</label>
            <Input value={draft.email} onChange={(e) => setDraftField('email', e.target.value)} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Phone</label>
            <Input value={draft.phone} onChange={(e) => setDraftField('phone', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Location</label>
            <Input value={draft.location} onChange={(e) => setDraftField('location', e.target.value)} />
          </div>
          {isEdit && (
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Status</label>
              <Select value={draft.status} onValueChange={(v) => setDraftField('status', v as ContactStatus)}>
                <SelectTrigger className="w-full text-[13px]">
                  <SelectValue>{(v: string) => STATUS_OPTIONS.find((s) => s.value === v)?.label ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isEdit ? 'Save changes' : 'Add contact'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditContactModal
