import { useEffect, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useReshapingResolver } from '@/hooks/useReshapingResolver'
import { bookCampPayloadSchema, type BookCampFormPayload } from '@/features/pharma/schemas/bookCamp.schemas'
import { useBookCamp } from '@/features/camps/hooks/useBookCamp'
import { useMonthAvailability } from '@/features/camps/hooks/useMonthAvailability'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/utils/apiError'
import type { BookCampPayload, CampMutationResponseEntity, CampType } from '@/types/campReal.types'
import type { ApiResponse } from '@/types/common.types'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import type { LocationValue } from '@/types/location.types'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'
import DoctorPicker from '@/features/pharma/components/DoctorPicker'
import MrPicker from '@/features/pharma/components/MrPicker'
import EditDoctorModal from '@/features/doctors/components/EditDoctorModal'
import DateSlotAvailabilityGrid from '@/features/pharma/components/DateSlotAvailabilityGrid'
import LocationPicker from '@/components/widgets/location-picker/LocationPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import FieldErrorText from '@/components/ui/FieldErrorText'
// import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const CAMP_TYPE_OPTIONS: { value: CampType; label: string }[] = [
  { value: 'screening', label: 'Screening' },
  { value: 'diet', label: 'Diet' },
  { value: 'lab', label: 'Lab' },
]

interface FormValues {
  mrId: string
  mrLabel: string
  doctorId: string
  doctorLabel: string
  type: CampType | ''
  patientExpectation: number
  date: string
  timeSlot: CampTimeSlotValue | ''
  location: LocationValue | null
  // notes: string
  // devices: string
}

const EMPTY_FORM_VALUES: FormValues = {
  mrId: '', mrLabel: '',
  doctorId: '', doctorLabel: '',
  type: '',
  patientExpectation: NaN,
  date: '',
  timeSlot: '',
  location: null,
  // notes: '',
  // devices: '',
}

// selfMrId is spliced in as `mr` when the caller IS the MR — the schema
// requires `mr` unconditionally but an MR's form never shows the mrId field.
const useBookCampFormResolver = (needsMrPicker: boolean, selfMrId: string | undefined) =>
  useReshapingResolver<FormValues, BookCampFormPayload>({
    schema: bookCampPayloadSchema,
    toPayload: (values) => ({
      // Sent as '' when unresolved, never undefined, so Zod's min(1)/enum
      // checks produce a friendly required message instead of a generic type error.
      mr: ((needsMrPicker ? values.mrId : selfMrId) || '') as string,
      doctor: values.doctorId,
      type: values.type || undefined,
      // valueAsNumber turns a cleared field into NaN, not undefined — treat
      // NaN as "omit" while preserving a genuine 0.
      patientExpectation: Number.isNaN(values.patientExpectation) ? undefined : values.patientExpectation,
      date: values.date,
      timeSlot: (values.timeSlot || '') as CampTimeSlotValue,
      location: values.location as LocationValue,
      notes: undefined,
      devices: undefined,
      // conscentPath omitted — no consent-file upload UI/infra exists yet.
    }),
    // Maps payload keys to this form's differently-named fields, so a Zod
    // error lands on the field actually rendered.
    topLevelFieldMap: { mr: 'mrId', doctor: 'doctorId' },
    nestedFieldMaps: {
      location: {
        addressLine1: 'location', addressLine2: 'location', locality: 'location',
        city: 'location', state: 'location', country: 'location', pincode: 'location',
        googlePlaceId: 'location', coordinates: 'location',
      },
    },
  })

interface BookCampFormProps {
  /** Whether this role books on behalf of someone else — shows the MR picker. MR itself never does. */
  needsMrPicker: boolean
  /** Locked context from the caller's page, never user-editable — spliced into the payload before the mutation fires; the form/schema never see it. */
  project: { id: string; name: string; campTimeSlots: CampTimeSlotValue[] }
  /** Called once the mutation succeeds, with the created camp — the parent (a
   * dialog over the project's camp list) closes and refetches. */
  onBooked: (camp: ApiResponse<CampMutationResponseEntity>) => void
  /** Called when the user cancels out of step 1 — the parent owns closing its own dialog. */
  onCancel: () => void
}

// Shared across all 4 pharma portal pages — only whether the MR picker
// renders differs per role; the submitted payload is identical either way.
const BookCampForm = ({ needsMrPicker, project, onBooked, onCancel }: BookCampFormProps) => {
  const { session, hasPermission } = usePermission()
  const selfMrId = session?.role.id
  const canManageDoctors = hasPermission('doctor:manage')
  const [showNewDoctor, setShowNewDoctor] = useState(false)
  const { resolver, parsePayload } = useBookCampFormResolver(needsMrPicker, selfMrId)
  const bookCamp = useBookCamp()
  // isPending flips true only once mutate is called, but parsePayload's own
  // re-parse runs before that — this ref closes that race window synchronously.
  const submittingRef = useRef(false)
  // Covers the map pin's reverse-geocode AND the search box's async place
  // selection — either can still be in flight when Submit is clicked.
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')
  const [locationError, setLocationError] = useState<string | null>(null)

  const [step, setStep] = useState(0)
  const [step1Attempted, setStep1Attempted] = useState(false)
  const [step2Attempted, setStep2Attempted] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    trigger,
    setValue,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<FormValues>({
    resolver,
    mode: 'onChange',
    defaultValues: EMPTY_FORM_VALUES,
  })
  // useWatch, not watch() — watch() returns a function React Compiler can't
  // memoize safely and skips optimizing this whole component for.
  const mrLabel = useWatch({ control, name: 'mrLabel' })
  const doctorLabel = useWatch({ control, name: 'doctorLabel' })
  const location = useWatch({ control, name: 'location' })
  const watchedDate = useWatch({ control, name: 'date' })
  const watchedTimeSlot = useWatch({ control, name: 'timeSlot' })

  // The currently-displayed calendar month.
  const [month, setMonth] = useState<Date>(startOfToday)

  // Clearing must key off the actual coordinate pair, not `location` object
  // identity — LocationPicker/LocationAddressFields can re-fire onChange
  // with a new object reference for the same real point (e.g. an
  // address-field-only edit), and clearing on every such change would wipe
  // a valid selection for no reason.
  const coordKey = location?.coordinates ? `${location.coordinates[0]},${location.coordinates[1]}` : null
  const prevCoordKeyRef = useRef<string | null>(coordKey)
  useEffect(() => {
    if (prevCoordKeyRef.current !== null && coordKey !== null && prevCoordKeyRef.current !== coordKey) {
      setValue('date', '', { shouldDirty: true })
      setValue('timeSlot', '', { shouldDirty: true })
    }
    prevCoordKeyRef.current = coordKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordKey])

  // React Compiler auto-memoizes this — no manual useMemo/deps array, since
  // the coordinate-index accesses below don't infer cleanly against a
  // hand-written dependency list (see react-hooks/preserve-manual-memoization).
  const availabilityBasePayload = (() => {
    // Both checks matter: coordinates can be stale/missing, AND a pin-drag
    // or search-box pick can still be resolving even when coordinates are
    // already set from a PRIOR pick — querying mid-resolution risks
    // fetching against a location the user is actively in the middle of changing.
    if (!location?.coordinates || locationResolution !== 'idle') return null
    return {
      projectId: project.id,
      lat: location.coordinates[1],
      lng: location.coordinates[0],
    }
  })()

  const availabilityQuery = useMonthAvailability(availabilityBasePayload, month)
  const availability = availabilityQuery.dates

  // Changing the displayed month invalidates any date/slot picked in a
  // different month — the new month's availability map has no entry for
  // that old date, so a stale selection would otherwise silently linger.
  const onMonthChange = (next: Date) => {
    setMonth(next)
    setValue('date', '', { shouldDirty: true })
    setValue('timeSlot', '', { shouldDirty: true })
  }

  const onDateSelect = (date: string) => {
    if (date === watchedDate) return
    setValue('date', date, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    // Changing the date invalidates any slot picked for a DIFFERENT date.
    setValue('timeSlot', '', { shouldDirty: true })
  }
  const onSlotSelect = (slot: CampTimeSlotValue) => {
    setValue('timeSlot', slot, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }

  // Step-scoped so an error on a later step's field never appears just
  // because an earlier step's Next was attempted.
  const fieldError = (field: keyof FormValues) => {
    if (touchedFields[field] || isSubmitted) return errors[field]?.message
    if (step1Attempted && (field === 'mrId' || field === 'doctorId')) return errors[field]?.message
    if (step2Attempted && field === 'location') return errors[field]?.message
    return undefined
  }

  // Should be unreachable for a genuine pharma MR session — fails safely
  // instead of submitting `mr: undefined` if it happens anyway.
  const missingSelfMrId = !needsMrPicker && !selfMrId

  const handleNext1 = async () => {
    setStep1Attempted(true)
    // Blocks Next the same way Submit already blocked on this — a genuine
    // session-data gap, not a validation failure the user can fix by re-entering anything.
    if (missingSelfMrId) return
    const valid = await trigger(needsMrPicker ? ['mrId', 'doctorId'] : ['doctorId'])
    if (valid) setStep(1)
  }
  const handleNext2 = async () => {
    setStep2Attempted(true)
    // Same guard shape onSubmit uses — a still-resolving pin shouldn't let
    // the user into step 3, where the calendar would fetch against a
    // stale/wrong location.
    if (locationResolution !== 'idle') {
      setLocationError(
        locationResolution === 'loading'
          ? 'Still resolving the picked location — wait a moment and try again'
          : 'Retry or choose "Use this pin" for the location before saving',
      )
      return
    }
    setLocationError(null)
    const valid = await trigger(['location'])
    if (valid) setStep(2)
  }

  const onSubmit = async (values: FormValues) => {
    // Same failure mode GeoProfileDetailPage guards: the pin/search result can
    // still be resolving (or have failed) when Submit is clicked.
    if (locationResolution !== 'idle') {
      setLocationError(
        locationResolution === 'loading'
          ? 'Still resolving the picked location — wait a moment and try again'
          : 'Retry or choose "Use this pin" for the location before saving',
      )
      return
    }
    setLocationError(null)
    const formPayload = await parsePayload(values)
    // project is context, not form state — assembled here, never claimed as
    // the resolver's own output type (see BookCampFormPayload).
    const payload: BookCampPayload = { ...formPayload, project: project.id }
    const res = await bookCamp.mutateAsync(payload)
    reset(EMPTY_FORM_VALUES)
    setStep(0)
    setStep1Attempted(false)
    setStep2Attempted(false)
    onBooked(res)
  }

  // React Compiler flags a ref read inside handleSubmit's callback, so the
  // guard wraps the callback's invocation instead of living inside it.
  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    handleSubmit(onSubmit)(event)
      .catch(() => {})
      .finally(() => { submittingRef.current = false })
  }

  if (project.campTimeSlots.length === 0) {
    return (
      <div className="text-[13px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger">
        This project has no configured time slots — add one in the project's settings before booking.
      </div>
    )
  }

  return (
    <form onSubmit={onFormSubmit} className="space-y-4" noValidate>
      <div className="text-[12px] rounded-lg px-3 py-2 bg-muted/50" style={{ color: 'var(--qms-text-muted)' }}>
        Booking for project: <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{project.name}</span>
      </div>

      {step === 0 && (
        <>
          {needsMrPicker && (
            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">MR *</Label>
              <Controller
                control={control}
                name="mrId"
                render={({ field }) => (
                  <MrPicker value={field.value} label={mrLabel} onChange={(id, l) => { field.onChange(id); setValue('mrLabel', l) }} />
                )}
              />
              {fieldError('mrId') && <p className="text-[11px] mt-1 text-danger">{fieldError('mrId')}</p>}
            </div>
          )}

          {missingSelfMrId && (
            <div className="text-[12px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger">
              Couldn't resolve your MR identity from the session — try reloading the page.
            </div>
          )}

          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Doctor *</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <Controller
                  control={control}
                  name="doctorId"
                  render={({ field }) => (
                    <DoctorPicker value={field.value} label={doctorLabel} onChange={(id, l) => { field.onChange(id); setValue('doctorLabel', l) }} />
                  )}
                />
              </div>
              {canManageDoctors && session && (
                <Button type="button" variant="outline" onClick={() => setShowNewDoctor(true)}>
                  New doctor
                </Button>
              )}
            </div>
            {fieldError('doctorId') && <p className="text-[11px] mt-1 text-danger">{fieldError('doctorId')}</p>}
          </div>

          {showNewDoctor && session && (
            <EditDoctorModal
              open
              doctor={null}
              forcedTenant={{ id: session.tenant.id, label: session.tenant.name }}
              onCreated={(created) => {
                setValue('doctorId', created.id, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
                setValue('doctorLabel', `${created.name} (${created.pharmaCode})`)
              }}
              onClose={() => setShowNewDoctor(false)}
            />
          )}
        </>
      )}

      {step === 1 && (
        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Location *</Label>
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <LocationPicker
                value={field.value}
                onChange={field.onChange}
                onResolutionStateChange={setLocationResolution}
                defaultCountry="India"
                countryCode="IN"
                showAddressFields
              />
            )}
          />
          {fieldError('location') && <FieldErrorText message={fieldError('location')!} />}
        </div>
      )}

      {step === 2 && (
        <>
          <div>
            {location?.coordinates && locationResolution === 'idle' ? (
              <DateSlotAvailabilityGrid
                availability={availability}
                campTimeSlots={project.campTimeSlots}
                selectedDate={watchedDate}
                selectedSlot={watchedTimeSlot}
                onDateSelect={onDateSelect}
                onSlotSelect={onSlotSelect}
                month={month}
                onMonthChange={onMonthChange}
                isLoading={availabilityQuery.isLoading}
                error={availabilityQuery.error}
                onRetry={availabilityQuery.refetch}
              />
            ) : (
              <p className="text-[13px] rounded-lg px-3 py-2 bg-muted/50" style={{ color: 'var(--qms-text-muted)' }}>
                Pick a location above to see availability.
              </p>
            )}
            {fieldError('date') && <p className="text-[11px] mt-1 text-danger">{fieldError('date')}</p>}
            {fieldError('timeSlot') && <p className="text-[11px] mt-1 text-danger">{fieldError('timeSlot')}</p>}
          </div>

          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Camp type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>
                    {CAMP_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label htmlFor="bookCampPatientExpectation" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Patients expected</Label>
            <Input id="bookCampPatientExpectation" type="number" className="text-[13px]" {...register('patientExpectation', { valueAsNumber: true })} />
            {fieldError('patientExpectation') && <p className="text-[11px] mt-1 text-danger">{fieldError('patientExpectation')}</p>}
          </div>

          {/* Hidden pending an integrate-or-remove decision — devices now requires InventoryMaster
              ObjectIds, not free text, and neither field is re-approved for this form yet.
          <div>
            <Label htmlFor="bookCampDevices" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Devices</Label>
            <Input id="bookCampDevices" className="text-[13px]" placeholder="e.g. bp-monitor, glucometer" {...register('devices')} />
          </div>

          <div>
            <Label htmlFor="bookCampNotes" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Notes</Label>
            <Textarea id="bookCampNotes" className="text-[13px]" placeholder="Optional" {...register('notes')} />
          </div>
          */}

          {bookCamp.isError && (
            <div className="text-[12px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger">
              {getApiErrorMessage(bookCamp.error, 'Could not book this camp — try again.')}
            </div>
          )}
        </>
      )}

      {locationError && (
        <div className="text-[12px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger">
          {locationError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {step === 0 && (
          <>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="button" onClick={handleNext1}>Next</Button>
          </>
        )}
        {step === 1 && (
          <>
            <Button type="button" variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button type="button" onClick={handleNext2}>Next</Button>
          </>
        )}
        {step === 2 && (
          <>
            <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button
              type="submit"
              disabled={bookCamp.isPending || missingSelfMrId || locationResolution === 'loading'}
              className="font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              {bookCamp.isPending ? 'Booking…' : locationResolution === 'loading' ? 'Resolving location…' : 'Book camp'}
            </Button>
          </>
        )}
      </div>
    </form>
  )
}

export default BookCampForm
