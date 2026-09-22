import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import LocationPicker from '@/components/widgets/location-picker/LocationPicker'
import LocationAddressFields from '@/components/widgets/location-picker/LocationAddressFields'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'
import DoctorScopeFields from '@/features/doctors/components/DoctorScopeFields'
import type { DoctorCreateScope } from '@/features/doctors/hooks/useDoctorCreateScope'
import { SPECIALIZATION_OPTIONS } from '@/features/doctors/doctors.ui'
import {
  createDoctorFormSchema,
  editDoctorFormSchema,
  emptyCreateDoctorFormValues,
  fromDoctorEntity,
  toCreateDoctorPayload,
  toUpdateDoctorPayload,
  type CreateDoctorFormValues,
  type EditDoctorFormValues,
} from '@/features/doctors/schemas/doctorForm'
import type { CreateDoctorPayload, DoctorEntity, DoctorSpecialization, DoctorStatus, UpdateDoctorPayload } from '@/types/doctor.types'
import type { LocationValue } from '@/types/location.types'

const STATUS_OPTIONS: { value: DoctorStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

interface DoctorSingleFormProps {
  doctor: DoctorEntity | null
  scope: DoctorCreateScope
  forcedTenant?: { id: string; label: string }
  forcedDivision?: { id: string; label: string; note?: string }
  onSubmit: (payload: CreateDoctorPayload | UpdateDoctorPayload) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}

// Thin dispatcher only — no hooks of its own. Conditionally choosing which useForm
// generic/resolver to call within one component body would violate the Rules of Hooks even
// though the modal always remounts per-doctor (EditDoctorModal's key={doctor?.id ?? '__new__'}
// pattern) — a branch inside one component is still a hook-order violation regardless of
// remounting, so create/edit are two genuinely separate components instead.
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
  } = useForm<CreateDoctorFormValues>({
    resolver: zodResolver(createDoctorFormSchema),
    mode: 'onChange',
    defaultValues: emptyCreateDoctorFormValues,
  })

  const fieldError = (field: keyof CreateDoctorFormValues) =>
    (touchedFields[field] || isSubmitted) ? errors[field]?.message : undefined

  const locationErrorMessage = (touchedFields.location || isSubmitted)
    ? (errors.location?.coordinates?.message ?? errors.location?.message)
    : undefined

  const onFormSubmit = handleSubmit(async (values) => {
    setFormError(null)

    // Same two-state block used by NearestGeoProfilesPage/CampDetailPageReal's own save/search
    // handlers — a failed or still-resolving pin must never be allowed through, since either
    // could leave stale/incomplete address data sitting in the submitted location.
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
  } = useForm<EditDoctorFormValues>({
    resolver: zodResolver(editDoctorFormSchema),
    mode: 'onChange',
    defaultValues: fromDoctorEntity(doctor),
  })

  const locationErrorMessage = errors.location?.coordinates?.message ?? errors.location?.message

  // This IS the <form>'s onSubmit — `handleSubmit` is RHF's own wrapper; the inner callback is
  // async and awaits onSubmit so RHF's formState.isSubmitting stays true for the full round
  // trip (client validation AND the coordinator's mutateAsync), closing the double-submit
  // window a synchronous callback would leave open.
  const onFormSubmit = handleSubmit(async (values) => {
    setFormError(null)
    // Clear any manually-set field errors from a PRIOR failed submit attempt first — RHF does
    // not auto-clear a manually setError'd field the way it clears its own resolver-driven
    // errors, so without this a stale message could keep showing even after the user fixed
    // that field and this attempt would otherwise succeed.
    clearErrors(['email', 'mobile', 'location'])

    // Location-resolution guard — identical to create mode: today's actual behavior blocks
    // BOTH create and edit while a pin is still resolving or has failed, not create only. Not a
    // field error (no single field it belongs to — it's blocking on the external LocationPicker
    // widget's own async state), so this alone uses the form-level formError slot.
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
    // Email — invalid format: only enforced once actually touched (an untouched legacy
    // malformed email must round-trip on an unrelated edit — the bare z.string() schema field
    // never catches this).
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
    // Location: `null` is fine only as the untouched legacy passthrough. If the user actively
    // cleared a previously-populated location, that must be a blocked field error — mapping it
    // to `location: undefined` would silently omit it from the request and leave the doctor's
    // old location unchanged while reporting success. A touched-but-incomplete location never
    // reaches this handler at all — RHF's own field-level validation against the location
    // schema already blocks submit natively once any part of the object is dirtied.
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
