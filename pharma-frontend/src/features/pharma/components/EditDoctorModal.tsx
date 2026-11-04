import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, LocationPicker, LocationAddressFields, GoogleMapsProvider } from '@qms/ui'
import type { LocationResolutionState } from '@qms/ui'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'
import { useCreateDoctor } from '@/features/pharma/hooks/useCreateDoctor'
import { useUpdateDoctor } from '@/features/pharma/hooks/useUpdateDoctor'
import {
  createDoctorFormSchemaFor,
  editDoctorFormSchemaFor,
  emptyCreateDoctorFormValues as sharedEmptyCreateDoctorFormValues,
  fromDoctorEntity,
  toCreateDoctorPayload,
  toUpdateDoctorPayload,
  type CreateDoctorFormValues,
  type EditDoctorFormValues,
} from '@qms/core'
import { SPECIALIZATION_OPTIONS } from '@/types/doctor.types'
import type { CreateDoctorPayload, DoctorEntity, DoctorSpecialization, DoctorStatus, UpdateDoctorPayload } from '@/types/doctor.types'
import type { LocationValue } from '@qms/core'
import ENV from '@/config/env'

// Shared schema module (@qms/core) is generic over the specialization union — bind it to this
// app's own DoctorSpecialization values once, here, rather than at every call site.
const SPECIALIZATION_VALUES = SPECIALIZATION_OPTIONS.map((o) => o.value) as [DoctorSpecialization, ...DoctorSpecialization[]]
const createDoctorFormSchema = createDoctorFormSchemaFor(SPECIALIZATION_VALUES)
const editDoctorFormSchema = editDoctorFormSchemaFor(SPECIALIZATION_VALUES)
const emptyCreateDoctorFormValues = sharedEmptyCreateDoctorFormValues<DoctorSpecialization>('cp')

// Create/update's 400 body is { message: 'Validation Error', data: { fields: {field: reason} } } —
// the generic getApiErrorMessage only reads the top-level `message`, which tells the user nothing
// about which field actually failed. Unpack the per-field reasons first. Mirrors
// internal-frontend's EditDoctorModal.tsx's saveDoctorErrorMessage.
function saveDoctorErrorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { data?: { message?: string; data?: { fields?: Record<string, string> } } } })?.response
  const fields = response?.data?.data?.fields
  if (fields && Object.keys(fields).length > 0) {
    return Object.entries(fields).map(([field, reason]) => `${field}: ${reason}`).join('; ')
  }
  return getApiErrorMessage(err, fallback)
}

const STATUS_OPTIONS: { value: DoctorStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

interface EditDoctorModalProps {
  open: boolean
  doctor: DoctorEntity | null
  /** The MR's own division — an MR's doctor is always scoped to their own session division,
   * never picked (unlike internal-frontend's full EditDoctorModal, which also serves
   * platform/admin callers who must pick a tenant+division). */
  divisionId: string
  onClose: () => void
  onCreated?: (doctor: DoctorEntity) => void
}

// Lean MR-only create/edit modal — no CSV bulk import, no tenant/division picker. Mirrors
// internal-frontend's EditDoctorModal.tsx's single-doctor path only.
//
// Unlike internal-frontend (GoogleMapsProvider mounted globally at AppLayout), this wraps its
// own provider so the Maps SDK only loads when this lazy-loaded modal actually mounts.
const EditDoctorModal = ({ open, doctor, divisionId, onClose, onCreated }: EditDoctorModalProps) => {
  if (!open) return null
  return (
    <GoogleMapsProvider apiKey={ENV.Maps.ApiKey}>
      <EditDoctorModalForm
        key={doctor?.id ?? '__new__'}
        doctor={doctor}
        divisionId={divisionId}
        onClose={onClose}
        onCreated={onCreated}
      />
    </GoogleMapsProvider>
  )
}

interface EditDoctorModalFormProps {
  doctor: DoctorEntity | null
  divisionId: string
  onClose: () => void
  onCreated?: (doctor: DoctorEntity) => void
}

const EditDoctorModalForm = ({ doctor, divisionId, onClose, onCreated }: EditDoctorModalFormProps) => {
  const isEdit = !!doctor
  const createDoctor = useCreateDoctor()
  const updateDoctor = useUpdateDoctor(doctor?.id ?? '')

  const handleClose = () => onClose()

  const handleSubmit = async (payload: CreateDoctorPayload | UpdateDoctorPayload) => {
    try {
      if (isEdit) {
        await updateDoctor.mutateAsync(payload as UpdateDoctorPayload)
        toast.success('Doctor updated')
      } else {
        const created = await createDoctor.mutateAsync(payload as CreateDoctorPayload)
        toast.success('Doctor added')
        if (created.data) onCreated?.(created.data)
      }
      handleClose()
    } catch (err) {
      toast.error(saveDoctorErrorMessage(err, 'Could not save doctor — try again.'))
    }
  }

  const isSaving = createDoctor.isPending || updateDoctor.isPending

  return (
    <Dialog open onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit doctor' : 'Add doctor'}</DialogTitle>
        </DialogHeader>

        {doctor ? (
          <EditDoctorSingleForm doctor={doctor} onSubmit={handleSubmit as (p: UpdateDoctorPayload) => Promise<void>} onCancel={handleClose} isSaving={isSaving} />
        ) : (
          <CreateDoctorSingleForm divisionId={divisionId} onSubmit={handleSubmit as (p: CreateDoctorPayload) => Promise<void>} onCancel={handleClose} isSaving={isSaving} />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface CreateDoctorSingleFormProps {
  divisionId: string
  onSubmit: (payload: CreateDoctorPayload) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}

const CreateDoctorSingleForm = ({ divisionId, onSubmit, onCancel, isSaving }: CreateDoctorSingleFormProps) => {
  const [locationHint, setLocationHint] = useState<string | null>(null)
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, touchedFields, isSubmitted, isSubmitting },
  } = useForm<CreateDoctorFormValues<DoctorSpecialization>>({
    resolver: zodResolver(createDoctorFormSchema),
    mode: 'onChange',
    defaultValues: emptyCreateDoctorFormValues,
  })

  const fieldError = (field: keyof CreateDoctorFormValues<DoctorSpecialization>) =>
    (touchedFields[field] || isSubmitted) ? errors[field]?.message : undefined

  const locationErrorMessage = (touchedFields.location || isSubmitted)
    ? (errors.location?.coordinates?.message ?? errors.location?.message)
    : undefined

  const onFormSubmit = handleSubmit(async (values) => {
    setFormError(null)

    if (locationResolution === 'loading') {
      setFormError('Still resolving the picked location — wait a moment and try again')
      return
    }
    if (locationResolution === 'error') {
      setFormError('Retry, or choose "Use this pin," for the location before saving')
      return
    }
    if (!divisionId) {
      setFormError("Your account isn't assigned to a division — contact an admin before adding doctors.")
      return
    }

    // No `tenant` — an MR's session is already pinned to one customer tenant, so there's no
    // tenant to pick; the shared mapper's `tenant` field simply doesn't apply here, it's not
    // "pre-filled" from anywhere.
    await onSubmit(toCreateDoctorPayload(values, { division: divisionId }) as CreateDoctorPayload)
  })

  return (
    <form onSubmit={onFormSubmit} noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="create-doctor-pharmaCode" className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma doctor code</label>
          <Input id="create-doctor-pharmaCode" aria-describedby={fieldError('pharmaCode') ? 'create-doctor-pharmaCode-error' : undefined} aria-invalid={!!fieldError('pharmaCode')} {...register('pharmaCode')} />
          {fieldError('pharmaCode') && <p id="create-doctor-pharmaCode-error" className="text-xs text-danger mt-1.5">{fieldError('pharmaCode')}</p>}
        </div>
        <div>
          <label htmlFor="create-doctor-name" className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Doctor name</label>
          <Input id="create-doctor-name" aria-describedby={fieldError('name') ? 'create-doctor-name-error' : undefined} aria-invalid={!!fieldError('name')} {...register('name')} />
          {fieldError('name') && <p id="create-doctor-name-error" className="text-xs text-danger mt-1.5">{fieldError('name')}</p>}
        </div>
        <div>
          <label htmlFor="create-doctor-specialization" className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Specialization</label>
          <Controller
            control={control}
            name="specialization"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v as DoctorSpecialization)}>
                <SelectTrigger id="create-doctor-specialization" className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPECIALIZATION_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <label htmlFor="create-doctor-mobile" className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Mobile</label>
          <Input id="create-doctor-mobile" aria-describedby={fieldError('mobile') ? 'create-doctor-mobile-error' : undefined} aria-invalid={!!fieldError('mobile')} {...register('mobile')} />
          {fieldError('mobile') && <p id="create-doctor-mobile-error" className="text-xs text-danger mt-1.5">{fieldError('mobile')}</p>}
        </div>
        <div>
          <label htmlFor="create-doctor-email" className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</label>
          <Input id="create-doctor-email" aria-describedby={fieldError('email') ? 'create-doctor-email-error' : undefined} aria-invalid={!!fieldError('email')} {...register('email')} />
          {fieldError('email') && <p id="create-doctor-email-error" className="text-xs text-danger mt-1.5">{fieldError('email')}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Location</label>
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <>
                <LocationPicker
                  apiKey={ENV.Maps.ApiKey}
                  mapId={ENV.Maps.MapId}
                  value={(field.value as LocationValue | undefined) ?? null}
                  onChange={field.onChange}
                  onResolutionStateChange={setLocationResolution}
                  onLocationHintChange={setLocationHint}
                  defaultCountry="India"
                  countryCode="IN"
                />
                <LocationAddressFields
                  value={(field.value as LocationValue | undefined) ?? null}
                  onChange={field.onChange}
                  defaultCountry="India"
                  locationHint={locationHint}
                />
              </>
            )}
          />
          {locationErrorMessage && <p className="text-xs text-danger mt-1.5">{locationErrorMessage}</p>}
        </div>

        {formError && (
          <div className="sm:col-span-2 text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
            {formError}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting || isSaving}>Add doctor</Button>
      </DialogFooter>
    </form>
  )
}

interface EditDoctorSingleFormProps {
  doctor: DoctorEntity
  onSubmit: (payload: UpdateDoctorPayload) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}

const EditDoctorSingleForm = ({ doctor, onSubmit, onCancel, isSaving }: EditDoctorSingleFormProps) => {
  const [locationHint, setLocationHint] = useState<string | null>(null)
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setError,
    clearErrors,
    formState: { errors, dirtyFields, isSubmitting },
  } = useForm<EditDoctorFormValues<DoctorSpecialization>>({
    resolver: zodResolver(editDoctorFormSchema),
    mode: 'onChange',
    defaultValues: fromDoctorEntity(doctor),
  })

  const locationErrorMessage = errors.location?.coordinates?.message ?? errors.location?.message

  const onFormSubmit = handleSubmit(async (values) => {
    setFormError(null)
    clearErrors(['email', 'mobile', 'location'])

    if (locationResolution === 'loading') {
      setFormError('Still resolving the picked location — wait a moment and try again')
      return
    }
    if (locationResolution === 'error') {
      setFormError('Retry, or choose "Use this pin," for the location before saving')
      return
    }

    if (dirtyFields.email && !values.email.trim()) {
      setError('email', { message: 'Email cannot be cleared to blank — leave it unchanged, or enter a valid email' })
      return
    }
    if (dirtyFields.email && values.email.trim() && !z.string().email().safeParse(values.email.trim()).success) {
      setError('email', { message: 'Enter a valid email' })
      return
    }
    if (dirtyFields.mobile && values.mobile.trim().length < 10) {
      setError('mobile', { message: 'Mobile number must be at least 10 characters' })
      return
    }
    if (dirtyFields.location && values.location === null) {
      setError('location', { message: 'Location cannot be cleared — pick a new location on the map, or leave it unchanged' })
      return
    }

    await onSubmit(toUpdateDoctorPayload(values, dirtyFields))
  })

  return (
    <form onSubmit={onFormSubmit} noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="edit-doctor-pharmaCode" className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma doctor code</label>
          <p id="edit-doctor-pharmaCode" className="text-[13px] py-1" style={{ color: 'var(--qms-text)' }}>{doctor.pharmaCode}</p>
        </div>
        <div>
          <label htmlFor="edit-doctor-name" className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Doctor name</label>
          <Input id="edit-doctor-name" aria-describedby={errors.name?.message ? 'edit-doctor-name-error' : undefined} aria-invalid={!!errors.name?.message} {...register('name')} />
          {errors.name?.message && <p id="edit-doctor-name-error" className="text-xs text-danger mt-1.5">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="edit-doctor-specialization" className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Specialization</label>
          <Controller
            control={control}
            name="specialization"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v as DoctorSpecialization)}>
                <SelectTrigger id="edit-doctor-specialization" className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPECIALIZATION_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <label htmlFor="edit-doctor-mobile" className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Mobile</label>
          <Input id="edit-doctor-mobile" aria-describedby={errors.mobile?.message ? 'edit-doctor-mobile-error' : undefined} aria-invalid={!!errors.mobile?.message} {...register('mobile')} />
          {errors.mobile?.message && <p id="edit-doctor-mobile-error" className="text-xs text-danger mt-1.5">{errors.mobile.message}</p>}
        </div>
        <div>
          <label htmlFor="edit-doctor-email" className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</label>
          <Input id="edit-doctor-email" aria-describedby={errors.email?.message ? 'edit-doctor-email-error' : undefined} aria-invalid={!!errors.email?.message} {...register('email')} />
          {errors.email?.message && <p id="edit-doctor-email-error" className="text-xs text-danger mt-1.5">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="edit-doctor-status" className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Status</label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v as DoctorStatus)}>
                <SelectTrigger id="edit-doctor-status" className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Location</label>
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <>
                <LocationPicker
                  apiKey={ENV.Maps.ApiKey}
                  mapId={ENV.Maps.MapId}
                  value={field.value as LocationValue | null}
                  onChange={field.onChange}
                  onResolutionStateChange={setLocationResolution}
                  onLocationHintChange={setLocationHint}
                  defaultCountry="India"
                  countryCode="IN"
                />
                <LocationAddressFields
                  value={field.value as LocationValue | null}
                  onChange={field.onChange}
                  defaultCountry="India"
                  locationHint={locationHint}
                />
              </>
            )}
          />
          {locationErrorMessage && <p className="text-xs text-danger mt-1.5">{locationErrorMessage}</p>}
        </div>

        {formError && (
          <div className="sm:col-span-2 text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
            {formError}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting || isSaving}>Save changes</Button>
      </DialogFooter>
    </form>
  )
}

export default EditDoctorModal
