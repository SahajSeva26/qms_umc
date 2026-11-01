import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { LocationPicker, LocationAddressFields, type LocationResolutionState } from '@qms/ui'
import DoctorScopeFields from '@/features/doctors/components/DoctorScopeFields'
import type { DoctorCreateScope } from '@/features/doctors/hooks/useDoctorCreateScope'
import { SPECIALIZATION_OPTIONS } from '@/features/doctors/doctors.ui'
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
import type { CreateDoctorPayload, DoctorEntity, DoctorSpecialization, DoctorStatus, UpdateDoctorPayload } from '@/types/doctor.types'
import type { LocationValue } from '@qms/core'
import ENV from '@/config/env'

const STATUS_OPTIONS: { value: DoctorStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

// Shared schema module (@qms/core) is generic over the specialization union — bind it to this
// app's own DoctorSpecialization values once, here, rather than at every call site.
const SPECIALIZATION_VALUES = SPECIALIZATION_OPTIONS.map((o) => o.value) as [DoctorSpecialization, ...DoctorSpecialization[]]
const createDoctorFormSchema = createDoctorFormSchemaFor(SPECIALIZATION_VALUES)
const editDoctorFormSchema = editDoctorFormSchemaFor(SPECIALIZATION_VALUES)
const emptyCreateDoctorFormValues = sharedEmptyCreateDoctorFormValues<DoctorSpecialization>('cp')

interface DoctorSingleFormProps {
  doctor: DoctorEntity | null
  scope: DoctorCreateScope
  forcedTenant?: { id: string; label: string }
  forcedDivision?: { id: string; label: string; note?: string }
  onSubmit: (payload: CreateDoctorPayload | UpdateDoctorPayload) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}

// Thin dispatcher only — branching useForm's generic/resolver inside one component body would
// violate the Rules of Hooks, so create/edit are two separate components instead.
const DoctorSingleForm = (props: DoctorSingleFormProps) =>
  props.doctor
    ? (
        <EditDoctorSingleForm
          doctor={props.doctor}
          onSubmit={props.onSubmit as (payload: UpdateDoctorPayload) => Promise<void>}
          onCancel={props.onCancel}
          isSaving={props.isSaving}
        />
      )
    : (
        <CreateDoctorSingleForm
          scope={props.scope}
          forcedTenant={props.forcedTenant}
          forcedDivision={props.forcedDivision}
          onSubmit={props.onSubmit as (payload: CreateDoctorPayload) => Promise<void>}
          onCancel={props.onCancel}
          isSaving={props.isSaving}
        />
      )

export default DoctorSingleForm

interface CreateDoctorSingleFormProps {
  scope: DoctorCreateScope
  forcedTenant?: { id: string; label: string }
  forcedDivision?: { id: string; label: string; note?: string }
  onSubmit: (payload: CreateDoctorPayload) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}

const CreateDoctorSingleForm = ({ scope, forcedTenant, forcedDivision, onSubmit, onCancel, isSaving }: CreateDoctorSingleFormProps) => {
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

    // A failed or still-resolving pin must never be allowed through — either could leave
    // stale/incomplete address data in the submitted location.
    if (locationResolution === 'loading') {
      setFormError('Still resolving the picked location — wait a moment and try again')
      return
    }
    if (locationResolution === 'error') {
      setFormError('Retry, or choose "Use this pin," for the location before saving')
      return
    }

    if (scope.needsTenantPicker && !scope.tenantId) {
      toast.error('Company is required')
      return
    }
    if (scope.needsDivisionPicker && scope.divisionsErrored) {
      setFormError("Couldn't load this company's divisions — retry before adding a doctor.")
      return
    }
    const divisionId = scope.resolveDivisionId()
    if (!divisionId) {
      setFormError(
        scope.isCustomerActor
          ? "Your account isn't assigned to a division — contact an admin before adding doctors."
          : 'Division is required',
      )
      return
    }

    await onSubmit(toCreateDoctorPayload(values, { division: divisionId, tenant: scope.resolveTenantId() }))
  })

  return (
    <form onSubmit={onFormSubmit} noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DoctorScopeFields scope={scope} isEdit={false} forcedTenant={forcedTenant} forcedDivision={forcedDivision} mode="single" />

        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma doctor code</label>
          <Input {...register('pharmaCode')} />
          {fieldError('pharmaCode') && <p className="text-xs text-danger mt-1.5">{fieldError('pharmaCode')}</p>}
        </div>
        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Doctor name</label>
          <Input {...register('name')} />
          {fieldError('name') && <p className="text-xs text-danger mt-1.5">{fieldError('name')}</p>}
        </div>
        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Specialization</label>
          <Controller
            control={control}
            name="specialization"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v as DoctorSpecialization)}>
                <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPECIALIZATION_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Mobile</label>
          <Input {...register('mobile')} />
          {fieldError('mobile') && <p className="text-xs text-danger mt-1.5">{fieldError('mobile')}</p>}
        </div>
        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</label>
          <Input {...register('email')} />
          {fieldError('email') && <p className="text-xs text-danger mt-1.5">{fieldError('email')}</p>}
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

  // The async inner callback awaits onSubmit so isSubmitting stays true for the full round trip,
  // closing the double-submit window a synchronous callback would leave open.
  const onFormSubmit = handleSubmit(async (values) => {
    setFormError(null)
    // RHF doesn't auto-clear a manually setError'd field the way it clears resolver-driven
    // errors — without this a stale message could outlive the fix that would otherwise succeed.
    clearErrors(['email', 'mobile', 'location'])

    // Not a field error (no single field it belongs to) — uses the form-level formError slot.
    if (locationResolution === 'loading') {
      setFormError('Still resolving the picked location — wait a moment and try again')
      return
    }
    if (locationResolution === 'error') {
      setFormError('Retry, or choose "Use this pin," for the location before saving')
      return
    }

    // Email — blank: fine if untouched (legacy); blocked if the user cleared a real value.
    if (dirtyFields.email && !values.email.trim()) {
      setError('email', { message: 'Email cannot be cleared to blank — leave it unchanged, or enter a valid email' })
      return
    }
    // Only enforced once touched — an untouched legacy malformed email must round-trip unchanged.
    if (dirtyFields.email && values.email.trim() && !z.string().email().safeParse(values.email.trim()).success) {
      setError('email', { message: 'Enter a valid email' })
      return
    }
    // Mobile: an untouched legacy mobile under 10 chars must not block unrelated edits — only
    // enforce the length rule once the user has actually changed it.
    if (dirtyFields.mobile && values.mobile.trim().length < 10) {
      setError('mobile', { message: 'Mobile number must be at least 10 characters' })
      return
    }
    // `null` is fine only as the untouched legacy passthrough — an actively-cleared location must
    // block, or omitting it would silently leave the doctor's old location unchanged.
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
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma doctor code</label>
          <p className="text-[13px] py-1" style={{ color: 'var(--qms-text)' }}>{doctor.pharmaCode}</p>
        </div>
        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Doctor name</label>
          <Input {...register('name')} />
          {errors.name?.message && <p className="text-xs text-danger mt-1.5">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Specialization</label>
          <Controller
            control={control}
            name="specialization"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v as DoctorSpecialization)}>
                <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPECIALIZATION_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Mobile</label>
          <Input {...register('mobile')} />
          {errors.mobile?.message && <p className="text-xs text-danger mt-1.5">{errors.mobile.message}</p>}
        </div>
        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</label>
          <Input {...register('email')} />
          {errors.email?.message && <p className="text-xs text-danger mt-1.5">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Status</label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v as DoctorStatus)}>
                <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
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
