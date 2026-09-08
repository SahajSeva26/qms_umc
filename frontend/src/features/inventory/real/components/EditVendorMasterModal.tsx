import type { ReactNode } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import type { VendorContact, VendorMasterEntity } from '@/types/vendorMaster.types'
import { useCreateVendorMaster } from '@/features/inventory/real/hooks/useCreateVendorMaster'
import { useUpdateVendorMaster } from '@/features/inventory/real/hooks/useUpdateVendorMaster'
import {
  createVendorMasterSchema,
  updateVendorMasterSchema,
  type CreateVendorMasterFormValues,
  type UpdateVendorMasterFormValues,
} from '@/features/inventory/real/schemas/vendorMaster.schemas'
import LocationAddressFields from '@/components/widgets/location-picker/LocationAddressFields'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/ui/FieldLabel'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'

// An empty string is "provided but invalid" to the backend's email().optional() — must be an absent key, not ''.
function sanitizeContacts(contacts: VendorContact[] | undefined): VendorContact[] | undefined {
  if (!contacts?.length) return undefined
  return contacts.map((c) => ({
    name: c.name,
    number: c.number?.trim() || undefined,
    email: c.email?.trim() || undefined,
    designation: c.designation?.trim() || undefined,
  }))
}

const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    {children}
    {error && <p className="text-[11px] mt-1 text-danger">{error}</p>}
  </div>
)

const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <div
      className="h-8 min-w-0 flex items-center rounded-lg border px-2.5 text-[13px]"
      style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)', background: 'var(--qms-surface-strong)' }}
      title={value}
    >
      <span className="truncate">{value}</span>
    </div>
  </div>
)

interface EditVendorMasterModalProps {
  // null = create mode
  vendor: VendorMasterEntity | null
  onClose: () => void
  // Only a manage-level actor sees/sets status — passed down from the panel's own permission check.
  canManageStatus: boolean
}

const EditVendorMasterModal = ({ vendor, onClose, canManageStatus }: EditVendorMasterModalProps) => {
  const isEdit = !!vendor
  const createMutation = useCreateVendorMaster()
  const updateMutation = useUpdateVendorMaster(vendor?.id ?? '')

  if (isEdit) {
    return <EditForm vendor={vendor} onClose={onClose} mutation={updateMutation} canManageStatus={canManageStatus} />
  }

  return <CreateForm onClose={onClose} mutation={createMutation} />
}

const CreateForm = ({ onClose, mutation }: { onClose: () => void; mutation: ReturnType<typeof useCreateVendorMaster> }) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<CreateVendorMasterFormValues>({
    resolver: zodResolver(createVendorMasterSchema),
    mode: 'onChange',
    defaultValues: {
      code: '',
      name: '',
      contacts: [],
      address: null,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'contacts' })

  const fieldError = (field: keyof CreateVendorMasterFormValues) =>
    (touchedFields[field] || isSubmitted) ? errors[field]?.message : undefined

  const onSubmit = (values: CreateVendorMasterFormValues) => {
    mutation.mutate(
      {
        code: values.code,
        name: values.name,
        contacts: sanitizeContacts(values.contacts),
        address: values.address ?? undefined,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>New vendor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 min-w-0" noValidate>
          <Field label="Code *" error={fieldError('code')}>
            <Input type="text" className="text-[13px]" {...register('code')} />
          </Field>

          <Field label="Name *" error={fieldError('name')}>
            <Input type="text" className="text-[13px]" {...register('name')} />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-1">
              <FieldLabel>Contacts</FieldLabel>
              <button
                type="button"
                onClick={() => append({ name: '', number: '', email: '', designation: '' })}
                className="text-[12px] font-semibold flex items-center gap-1"
                style={{ color: 'var(--qms-brand)' }}
              >
                <FiPlus size={13} /> Add contact
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={f.id} className="rounded-lg border p-2.5 space-y-2" style={{ borderColor: 'var(--qms-border)' }}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Input placeholder="Name *" className="text-[13px]" {...register(`contacts.${i}.name`)} />
                      {errors.contacts?.[i]?.name && (
                        <p className="text-[11px] text-danger">{errors.contacts[i]?.name?.message}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Phone" className="text-[13px]" {...register(`contacts.${i}.number`)} />
                        <Input placeholder="Email" className="text-[13px]" {...register(`contacts.${i}.email`)} />
                      </div>
                      <Input placeholder="Designation" className="text-[13px]" {...register(`contacts.${i}.designation`)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label="Remove contact"
                      className="shrink-0 rounded-full p-1.5 hover:bg-black/5"
                    >
                      <FiTrash2 size={14} style={{ color: 'var(--qms-text-muted)' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Address</FieldLabel>
            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <LocationAddressFields value={field.value ?? null} onChange={field.onChange} />
              )}
            />
          </div>

          <MutationStatusBanner mutation={mutation} errorFallback="Could not save the vendor — try again." showSuccess={false} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Create vendor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const EditForm = ({
  vendor, onClose, mutation, canManageStatus,
}: {
  vendor: VendorMasterEntity
  onClose: () => void
  mutation: ReturnType<typeof useUpdateVendorMaster>
  canManageStatus: boolean
}) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, touchedFields, isSubmitted, dirtyFields },
  } = useForm<UpdateVendorMasterFormValues>({
    resolver: zodResolver(updateVendorMasterSchema),
    mode: 'onChange',
    defaultValues: {
      name: vendor.name,
      contacts: vendor.contacts,
      address: vendor.address ?? null,
      status: vendor.status,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'contacts' })

  const fieldError = (field: keyof UpdateVendorMasterFormValues) =>
    (touchedFields[field] || isSubmitted) ? errors[field]?.message : undefined

  const onSubmit = (values: UpdateVendorMasterFormValues) => {
    mutation.mutate(
      {
        name: values.name,
        contacts: dirtyFields.contacts ? sanitizeContacts(values.contacts) : undefined,
        // Only sent when dirty — the backend replaces address wholesale whenever the key is present at all.
        ...(dirtyFields.address ? { address: values.address ?? undefined } : {}),
        ...(canManageStatus ? { status: values.status } : {}),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Edit vendor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 min-w-0" noValidate>
          <ReadOnlyField label="Code" value={vendor.code} />

          <Field label="Name *" error={fieldError('name')}>
            <Input type="text" className="text-[13px]" {...register('name')} />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-1">
              <FieldLabel>Contacts</FieldLabel>
              <button
                type="button"
                onClick={() => append({ name: '', number: '', email: '', designation: '' })}
                className="text-[12px] font-semibold flex items-center gap-1"
                style={{ color: 'var(--qms-brand)' }}
              >
                <FiPlus size={13} /> Add contact
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={f.id} className="rounded-lg border p-2.5 space-y-2" style={{ borderColor: 'var(--qms-border)' }}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Input placeholder="Name *" className="text-[13px]" {...register(`contacts.${i}.name`)} />
                      {errors.contacts?.[i]?.name && (
                        <p className="text-[11px] text-danger">{errors.contacts[i]?.name?.message}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Phone" className="text-[13px]" {...register(`contacts.${i}.number`)} />
                        <Input placeholder="Email" className="text-[13px]" {...register(`contacts.${i}.email`)} />
                      </div>
                      <Input placeholder="Designation" className="text-[13px]" {...register(`contacts.${i}.designation`)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label="Remove contact"
                      className="shrink-0 rounded-full p-1.5 hover:bg-black/5"
                    >
                      <FiTrash2 size={14} style={{ color: 'var(--qms-text-muted)' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Address</FieldLabel>
            <Controller
              control={control}
              name="address"
              render={({ field }) => (
                <LocationAddressFields value={field.value ?? null} onChange={field.onChange} />
              )}
            />
          </div>

          {canManageStatus && (
            <Field label="Status">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full text-[13px]">
                      <SelectValue>{() => (field.value === 'active' ? 'Active' : field.value === 'inactive' ? 'Inactive' : 'Select status')}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          )}

          <MutationStatusBanner mutation={mutation} errorFallback="Could not save the vendor — try again." showSuccess={false} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditVendorMasterModal
