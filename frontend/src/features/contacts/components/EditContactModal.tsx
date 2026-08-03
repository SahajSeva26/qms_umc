import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { useCreateContact } from '@/features/contacts/hooks/useCreateContact'
import { useUpdateContact } from '@/features/contacts/hooks/useUpdateContact'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { usePermission } from '@/hooks/usePermission'
import { createContactSchema, updateContactSchema } from '@/features/contacts/schemas/contact.schemas'
import type { ContactEntity, ContactType, ContactStatus } from '@/types/contact.types'

const TYPE_OPTIONS: { value: ContactType; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'platform', label: 'Platform (QMS internal)' },
]

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

interface ContactDraft {
  name: string
  designation: string
  email: string
  phone: string
  location: string
  type: ContactType
  status: ContactStatus
}

const emptyDraft: ContactDraft = { name: '', designation: '', email: '', phone: '', location: '', type: 'customer', status: 'active' }

function draftFromContact(c: ContactEntity): ContactDraft {
  return {
    name: c.name,
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
}

// Mirrors `@/features/doctors/components/EditDoctorModal.tsx`'s exact shape:
// outer shell remounts the inner form keyed on contact id so draft state
// resets cleanly between "new" and different contacts.
const EditContactModal = ({ open, contact, onClose }: EditContactModalProps) => {
  if (!open) return null
  return <EditContactModalForm key={contact?.id ?? '__new__'} contact={contact} onClose={onClose} />
}

interface EditContactModalFormProps {
  contact: ContactEntity | null
  onClose: () => void
}

const EditContactModalForm = ({ contact, onClose }: EditContactModalFormProps) => {
  const isEdit = !!contact
  const [draft, setDraft] = useState<ContactDraft>(contact ? draftFromContact(contact) : emptyDraft)
  const [tenant, setTenant] = useState('')

  // contact.service.ts's resolveTenant(): a CUSTOMER-tenant caller is force-
  // pinned to their own tenant (whatever's sent is ignored), but a PLATFORM-
  // tenant caller (e.g. system@gmail.com) gets a hard 400 "Tenant is
  // required" if `tenant` is omitted — confirmed live via a direct create
  // attempt. Only platform staff need this picker at all.
  const { sessionPermissions } = usePermission()
  const needsTenantPicker = !isEdit && sessionPermissions?.tenantType === 'platform'
  // `enabled: needsTenantPicker` — NOT `{ limit: '0' }` (fixed 2026-08-03):
  // Mongoose's `.find().limit(0)` means "no limit at all," not "return
  // nothing" — this was silently fetching every tenant in the system,
  // unscoped, whenever this picker wasn't even shown.
  const { data: tenantsData } = useTenants({}, needsTenantPicker)
  const tenants = tenantsData?.data?.items ?? []

  // Type on CREATE is never a manual choice — it's derived from the target
  // company, hidden from this form entirely (2026-08-03). Two cases:
  // 1. No picker (customer-tenant caller, force-pinned server-side): use the
  //    caller's OWN tenant type from the session — always available, no
  //    permission gate (it's "what tenant am I," not "tell me about another
  //    tenant").
  // 2. Picker shown (platform-tenant caller choosing someone else's
  //    company): GET /tenants only includes `type` for a caller holding
  //    system:manage (tenant.mapper.ts's toResponse gate) — most platform
  //    staff creating a contact do NOT hold that permission, so the picked
  //    tenant's `type` is usually invisible to this form. Best-effort: use
  //    it if visible (system:manage caller), else default to 'customer' —
  //    the overwhelmingly common case (adding a contact FOR a customer
  //    company), matching the backend's own Contact.type schema default.
  const deriveCreateType = (): ContactType => {
    if (!needsTenantPicker) return (sessionPermissions?.tenantType as ContactType) ?? 'customer'
    const selected = tenants.find((t) => t.id === tenant)
    return (selected?.type as ContactType) ?? 'customer'
  }

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
        await updateContact.mutateAsync({
          name: result.data.name,
          designation: result.data.designation || undefined,
          email: result.data.email || undefined,
          phone: result.data.phone || undefined,
          location: result.data.location || undefined,
          type: result.data.type,
          status: result.data.status,
        })
        toast.success('Contact updated')
      } else {
        if (needsTenantPicker && !tenant) {
          toast.error('Select a company')
          return
        }
        const result = createContactSchema.safeParse({ ...draft, tenant: tenant || undefined, type: deriveCreateType() })
        if (!result.success) {
          toast.error(result.error.issues[0].message)
          return
        }
        await createContact.mutateAsync({
          tenant: result.data.tenant,
          name: result.data.name,
          designation: result.data.designation || undefined,
          email: result.data.email || undefined,
          phone: result.data.phone || undefined,
          location: result.data.location || undefined,
          type: result.data.type,
        })
        toast.success('Contact added')
      }
      handleClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save contact — try again.')
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
              <Select value={tenant} onValueChange={(v) => setTenant(v ?? '')}>
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
          <div className="sm:col-span-2">
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Name</label>
            <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Designation</label>
            <Input value={draft.designation} onChange={(e) => setDraft((p) => ({ ...p, designation: e.target.value }))} />
          </div>
          {isEdit && (
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Type</label>
              <Select value={draft.type} onValueChange={(v) => setDraft((p) => ({ ...p, type: v as ContactType }))}>
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
            <Input value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Phone</label>
            <Input value={draft.phone} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Location</label>
            <Input value={draft.location} onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))} />
          </div>
          {isEdit && (
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Status</label>
              <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v as ContactStatus }))}>
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
