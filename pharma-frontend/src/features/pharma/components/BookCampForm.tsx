import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { FiUserCheck, FiMapPin, FiCalendar, FiFileText, FiAlertTriangle } from 'react-icons/fi'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useReshapingResolver } from '@/hooks/useReshapingResolver'
import { bookCampPayloadSchema, type BookCampFormPayload } from '@/features/pharma/schemas/bookCamp.schemas'
import { useBookCamp, useDayRangeAvailability } from '@/features/camps'
import { useSession } from '@/hooks/useSession'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/utils/apiError'
import { haversineDistanceKm } from '@/utils/geo'
import type { BookCampPayload, CampMutationResponseEntity, CampType } from '@/types/campReal.types'
import type { ApiResponse } from '@qms/core'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import type { LocationValue } from '@qms/core'
import { LocationPicker, LocationAddressFields, GoogleMapsProvider, type LocationResolutionState } from '@qms/ui'
import type { DoctorEntity } from '@/types/doctor.types'
import { DOCTOR_RANGE_KM } from '@/types/doctor.types'
import DoctorDistancePicker from '@/features/pharma/components/DoctorDistancePicker'
import DoctorNameDivisionPicker from '@/features/pharma/components/DoctorNameDivisionPicker'
import DayStripAvailability from '@/features/pharma/components/DayStripAvailability'
import { Button } from '@qms/ui'
import { Textarea } from '@/components/ui/textarea'
import SectionHeader from '@/components/ui/SectionHeader'
import FieldErrorText from '@/components/ui/FieldErrorText'
import DialogErrorBoundary from '@/components/ui/DialogErrorBoundary'
import DialogOpeningFallback from '@/components/ui/DialogOpeningFallback'
import ENV from '@/config/env'

// This form is already the lazy chunk (see MrPortalPage.tsx), so the doctor-create modal is
// imported normally here — a second lazy boundary would defer nothing further.
const EditDoctorModal = lazy(() => import('@/features/pharma/components/EditDoctorModal'))

interface FormValues {
  doctorId: string
  doctorLabel: string
  date: string
  timeSlot: CampTimeSlotValue | ''
  location: LocationValue | null
  notes: string
  // devices: string — needs InventoryMaster ObjectIds, not free text; not re-approved for this form yet.
}

const EMPTY_FORM_VALUES: FormValues = {
  doctorId: '', doctorLabel: '',
  date: '',
  timeSlot: '',
  location: null,
  notes: '',
}

// pharma-frontend is MR-only — no on-behalf-of booking, so `mr` is spliced in at submit time
// (see onSubmit below), not part of this form's own reshaping.
const useBookCampFormResolver = (type: CampType, patientExpectation: number | undefined) =>
  useReshapingResolver<FormValues, BookCampFormPayload>({
    schema: bookCampPayloadSchema,
    toPayload: (values) => ({
      doctor: values.doctorId,
      type,
      patientExpectation,
      date: values.date,
      timeSlot: (values.timeSlot || '') as CampTimeSlotValue,
      location: values.location as LocationValue,
      notes: values.notes.trim() || undefined,
      devices: undefined,
    }),
    topLevelFieldMap: { doctor: 'doctorId' },
    nestedFieldMaps: {
      location: {
        addressLine1: 'location', addressLine2: 'location', locality: 'location',
        city: 'location', state: 'location', country: 'location', pincode: 'location',
        googlePlaceId: 'location', coordinates: 'location',
      },
    },
  })

interface BookCampFormProps {
  /** Locked context from the caller's page, never user-editable — no Camp type picker shown. */
  type: CampType | null
  /** Locked context from the caller's page — null until the caller's own project/camp-type picker has a selection. */
  project: { id: string; name: string; campTimeSlots: CampTimeSlotValue[]; daysToBookBefore: number } | null
  /** Owned by the caller's own "Project & camp" section — passed through untouched into the booking payload. */
  patientExpectation: number | undefined
  /** True when the caller's externally-owned patientExpectation input is invalid — blocks submit here too. */
  patientExpectationInvalid?: boolean
  /** Called on mutation success — the caller closes its dialog (or resets its inline form) and refetches. */
  onBooked: (camp: ApiResponse<CampMutationResponseEntity>) => void
  /** Called when the user cancels — the caller owns closing its own dialog or resetting its inline state. */
  onCancel: () => void
}

// Lean MR-only port of internal-frontend's BookCampForm.tsx — no on-behalf-of MR picker (an MR
// always books for themselves), so `mr` is spliced from the session unconditionally.
const BookCampForm = ({ type, project, patientExpectation, patientExpectationInvalid, onBooked, onCancel }: BookCampFormProps) => {
  const { session } = useSession()
  const { hasAnyPermission } = usePermission()
  const selfMrId = session?.role.id
  // doctor:create is enough — the configured default for new pharma-mr role types; doctor:manage also satisfies it.
  const canCreateDoctors = hasAnyPermission(['doctor:create', 'doctor:manage'])
  const [showNewDoctor, setShowNewDoctor] = useState(false)
  // A null type is just a resolver placeholder ('screening') — onSubmit's project-required guard blocks submit.
  const { resolver, parsePayload } = useBookCampFormResolver(type ?? 'screening', patientExpectation)
  const bookCamp = useBookCamp()
  // Closes the race window before isPending flips true, since parsePayload's re-parse runs first.
  const submittingRef = useRef(false)
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationHint, setLocationHint] = useState<string | null>(null)

  // Doctor search (both the division name-search and /doctors/nearest) scopes to the caller's
  // own division — pharma-frontend is MR-only, so there's no picked-MR's division to drift from.
  const actingDivisionId = session?.role.division ?? null

  // The picked doctor's OWN location, captured at pick time — the camp location defaults to this.
  // Once the doctor is cleared (or location is manually pushed out of range) this is cleared too.
  const [doctorLocation, setDoctorLocation] = useState<LocationValue | null>(null)
  // Set once a manual location edit pushes the picked doctor past DOCTOR_RANGE_KM away — switches
  // the Doctor section into a distance-sorted re-pick instead of silently keeping a stale doctor.
  const [doctorOutOfRange, setDoctorOutOfRange] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<FormValues>({
    resolver,
    mode: 'onChange',
    defaultValues: EMPTY_FORM_VALUES,
  })
  // useWatch, not watch() — watch() returns a function React Compiler can't memoize safely.
  const doctorLabel = useWatch({ control, name: 'doctorLabel' })
  const location = useWatch({ control, name: 'location' })
  const watchedDate = useWatch({ control, name: 'date' })
  const watchedTimeSlot = useWatch({ control, name: 'timeSlot' })

  // Keyed on the coordinate pair, not object identity — LocationPicker can re-fire onChange
  // with a new reference for the same point (e.g. an address-only edit).
  const coordKeyOf = (v: LocationValue | null) => (v?.coordinates ? `${v.coordinates[0]},${v.coordinates[1]}` : null)

  const handleSelectDoctor = (doctor: DoctorEntity | null) => {
    setDoctorOutOfRange(false)
    if (!doctor?.location) {
      setDoctorLocation(null)
      return
    }
    setDoctorLocation(doctor.location)
    // Goes straight through setValue, NOT handleLocationChange below — this default must never
    // immediately re-trigger its own out-of-range check.
    setValue('location', doctor.location, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }

  // Shared by the map picker and the manual address fields — only THIS function (never
  // handleSelectDoctor's direct setValue) re-checks the doctor's range, since it's the one genuine user-driven edit path.
  const handleLocationChange = (next: LocationValue) => {
    const prevCoordKey = coordKeyOf(location ?? null)
    const nextCoordKey = coordKeyOf(next)
    setValue('location', next, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    if (nextCoordKey === prevCoordKey) return
    // Clears date/slot too — availability depends on location.
    if (prevCoordKey !== null && nextCoordKey !== null) {
      setValue('date', '', { shouldDirty: true })
      setValue('timeSlot', '', { shouldDirty: true })
    }
    if (next.coordinates && doctorLocation?.coordinates) {
      const kmAway = haversineDistanceKm(doctorLocation.coordinates, next.coordinates)
      if (kmAway > DOCTOR_RANGE_KM) {
        setValue('doctorId', '', { shouldDirty: true })
        setValue('doctorLabel', '')
        setDoctorLocation(null)
        setDoctorOutOfRange(true)
      }
    }
  }

  const availabilityBasePayload = (() => {
    // A pin-drag/search pick can still be resolving even with coordinates already set.
    if (!project || !location?.coordinates || locationResolution !== 'idle') return null
    return {
      projectId: project.id,
      lat: location.coordinates[1],
      lng: location.coordinates[0],
      // Server defaults to screening (FO) availability when type is omitted.
      ...(type ? { type } : {}),
    }
  })()

  const availabilityQuery = useDayRangeAvailability(availabilityBasePayload, project?.daysToBookBefore)
  const availability = availabilityQuery.dates

  // Gated on availabilityBasePayload being non-null, or a disabled query's empty `availability`
  // reads as a false disconfirmation of an already-picked date/slot.
  useEffect(() => {
    if (!watchedDate || !availabilityBasePayload || availabilityQuery.isLoading || availabilityQuery.error) return
    const day = availability[watchedDate]
    if (!day?.available || (watchedTimeSlot && day.slots[watchedTimeSlot] !== true)) {
      setValue('date', '', { shouldDirty: true })
      setValue('timeSlot', '', { shouldDirty: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability, availabilityBasePayload, availabilityQuery.isLoading, availabilityQuery.error])

  const availabilityIndeterminate = !!watchedDate && !!availabilityBasePayload && (availabilityQuery.isLoading || !!availabilityQuery.error)

  const onDateSelect = (date: string) => {
    if (date === watchedDate) return
    setValue('date', date, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    setValue('timeSlot', '', { shouldDirty: true })
  }
  const onSlotSelect = (slot: CampTimeSlotValue) => {
    setValue('timeSlot', slot, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }

  const fieldError = (field: keyof FormValues) => {
    if (touchedFields[field] || isSubmitted) return errors[field]?.message
    return undefined
  }

  // Should be unreachable for a genuine pharma MR session — fails safely instead of
  // submitting `mr: undefined` if it happens anyway.
  const missingSelfMrId = !selfMrId

  const onSubmit = async (values: FormValues) => {
    // Should be unreachable (submit is disabled on all of these) — guards a stray Enter-key submit.
    if (!project || !type || patientExpectationInvalid || availabilityIndeterminate || !selfMrId) return
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
    // project/mr are context, not form state, so they're added here rather than via the resolver.
    const payload: BookCampPayload = { ...formPayload, project: project.id, mr: selfMrId }
    const res = await bookCamp.mutateAsync(payload)
    reset(EMPTY_FORM_VALUES)
    onBooked(res)
  }

  // React Compiler flags a ref read inside handleSubmit's callback, so the guard wraps it instead.
  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    handleSubmit(onSubmit)(event)
      .catch(() => {})
      .finally(() => { submittingRef.current = false })
  }

  if (project && project.campTimeSlots.length === 0) {
    return (
      <div className="text-[13px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger">
        This project has no configured time slots — add one in the project's settings before booking.
      </div>
    )
  }

  const locationReady = !!project && !!location?.coordinates && locationResolution === 'idle'
  const projectReady = !!project && !!type

  // Continues MrBookCampTab's "1 · Project & camp" numbering — pharma-frontend has no MR-picker
  // section (no on-behalf-of booking), so Doctor starts at 2, unlike internal-frontend's 2/3 split.
  const doctorSectionNumber = 2
  const locationSectionNumber = doctorSectionNumber + 1
  const dateSectionNumber = locationSectionNumber + 1
  const notesSectionNumber = dateSectionNumber + 1

  return (
    <GoogleMapsProvider apiKey={ENV.Maps.ApiKey}>
    <form onSubmit={onFormSubmit} noValidate>
      <div className="text-[12px] rounded-lg px-3 py-2 mb-3 bg-muted/50" style={{ color: 'var(--qms-text-muted)' }}>
        {project
          ? <>Booking for project: <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{project.name}</span></>
          : 'Select a project and camp type above to start booking.'}
      </div>

      {missingSelfMrId && (
        <div className="text-[12px] rounded-lg px-3 py-2 mb-3 bg-danger-soft border border-danger text-danger">
          Couldn't resolve your MR identity from the session — try reloading the page.
        </div>
      )}

      <div className="booking-section">
        <div className="flex items-center justify-between gap-2">
          <SectionHeader icon={FiUserCheck} spaced={false} number={doctorSectionNumber}>Doctor</SectionHeader>
          {canCreateDoctors && session && actingDivisionId && (
            <Button type="button" variant="outline" onClick={() => setShowNewDoctor(true)}>
              New doctor
            </Button>
          )}
        </div>
        <div className="space-y-1.5">
          {doctorOutOfRange && (
            <div className="flex items-start gap-1.5 text-[12px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger">
              <FiAlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>The previously picked doctor isn't within {DOCTOR_RANGE_KM}km of this camp location — pick a doctor near the new location instead.</span>
            </div>
          )}
          {/* Doctor selection is scoped by division, not the project — pickable before any project
              is chosen. Only the out-of-range variant needs a real location to compute distance. */}
          <Controller
            control={control}
            name="doctorId"
            render={({ field }) =>
              doctorOutOfRange ? (
                <DoctorDistancePicker
                  value={field.value}
                  label={doctorLabel}
                  coordinates={location?.coordinates}
                  onChange={(id, l) => { field.onChange(id); setValue('doctorLabel', l) }}
                  onSelectDoctor={handleSelectDoctor}
                  disabled={!locationReady}
                />
              ) : (
                <DoctorNameDivisionPicker
                  value={field.value}
                  label={doctorLabel}
                  division={actingDivisionId}
                  onChange={(id, l) => { field.onChange(id); setValue('doctorLabel', l) }}
                  onSelectDoctor={handleSelectDoctor}
                />
              )
            }
          />
        </div>
        {fieldError('doctorId') && <p className="text-[11px] mt-1 text-danger">{fieldError('doctorId')}</p>}

        {showNewDoctor && session && actingDivisionId && (
          <DialogErrorBoundary onClose={() => setShowNewDoctor(false)}>
            <Suspense fallback={<DialogOpeningFallback />}>
              <EditDoctorModal
                open
                doctor={null}
                divisionId={actingDivisionId}
                onCreated={(created) => {
                  setValue('doctorId', created.id, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
                  setValue('doctorLabel', `${created.name} (${created.pharmaCode})`)
                  handleSelectDoctor(created)
                }}
                onClose={() => setShowNewDoctor(false)}
              />
            </Suspense>
          </DialogErrorBoundary>
        )}
      </div>

      <div className="booking-section">
        <SectionHeader icon={FiMapPin} number={locationSectionNumber}>Camp location</SectionHeader>
        {!projectReady && (
          <p className="text-[13px] rounded-lg px-3 py-2 mb-2 bg-muted/50" style={{ color: 'var(--qms-text-muted)' }}>
            Select a project and camp type above first.
          </p>
        )}
        {projectReady && !location?.coordinates && (
          <p className="text-[12px] rounded-lg px-3 py-2 mb-2 bg-muted/50" style={{ color: 'var(--qms-text-muted)' }}>
            Defaults to the picked doctor's address — pick a doctor above, or set a location directly.
          </p>
        )}
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <div className="space-y-2">
              <LocationPicker
                apiKey={ENV.Maps.ApiKey}
                mapId={ENV.Maps.MapId}
                value={field.value}
                onChange={handleLocationChange}
                onResolutionStateChange={setLocationResolution}
                onLocationHintChange={setLocationHint}
                defaultCountry="India"
                countryCode="IN"
                disabled={!projectReady}
              />
              <LocationAddressFields value={field.value} onChange={handleLocationChange} defaultCountry="India" locationHint={locationHint} disabled={!projectReady} />
            </div>
          )}
        />
        {fieldError('location') && <FieldErrorText message={fieldError('location')!} />}
      </div>

      <div className="booking-section">
        <SectionHeader icon={FiCalendar} number={dateSectionNumber}>Date &amp; time slot</SectionHeader>
        {locationReady ? (
          <DayStripAvailability
            availability={availability}
            campTimeSlots={project.campTimeSlots}
            daysToBookBefore={project.daysToBookBefore}
            selectedDate={watchedDate}
            selectedSlot={watchedTimeSlot}
            onDateSelect={onDateSelect}
            onSlotSelect={onSlotSelect}
            isLoading={availabilityQuery.isLoading}
            error={availabilityQuery.error}
            onRetry={availabilityQuery.refetch}
            hasNextPage={availabilityQuery.hasNextPage}
            isFetchingNextPage={availabilityQuery.isFetchingNextPage}
            isFetchNextPageError={availabilityQuery.isFetchNextPageError}
            onLoadMore={availabilityQuery.fetchNextPage}
            eligibleFoCount={availabilityQuery.eligibleFoCount}
            workerLabel={type === 'diet' ? 'Dietitian' : 'FO'}
            city={location?.city}
          />
        ) : (
          <p className="text-[13px] rounded-lg px-3 py-2 bg-muted/50" style={{ color: 'var(--qms-text-muted)' }}>
            {!projectReady ? 'Select a project and camp type above first.' : 'Pick a location above to see availability.'}
          </p>
        )}
        {fieldError('date') && <p className="text-[11px] mt-1 text-danger">{fieldError('date')}</p>}
        {fieldError('timeSlot') && <p className="text-[11px] mt-1 text-danger">{fieldError('timeSlot')}</p>}
      </div>

      <div className="booking-section">
        <SectionHeader icon={FiFileText} number={notesSectionNumber}>Notes</SectionHeader>
        <Textarea
          aria-label="Notes"
          placeholder="Anything QMS / the FO needs to know about this camp…"
          className="text-[13px]"
          disabled={!projectReady}
          {...register('notes')}
        />
      </div>

      {bookCamp.isError && (
        <div className="text-[12px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger">
          {getApiErrorMessage(bookCamp.error, 'Could not book this camp — try again.')}
        </div>
      )}

      {locationError && (
        <div className="text-[12px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger">
          {locationError}
        </div>
      )}

      <div className="booking-footer">
        <p className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>
          On confirm, the nearest available FO is auto-assigned. If none is free, the camp is saved as Requested for Ops to assign.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            type="submit"
            disabled={!projectReady || bookCamp.isPending || missingSelfMrId || locationResolution === 'loading' || !!patientExpectationInvalid || availabilityIndeterminate}
            className="font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            {bookCamp.isPending ? 'Booking…' : locationResolution === 'loading' ? 'Resolving location…' : 'Book camp'}
          </Button>
        </div>
      </div>
    </form>
    </GoogleMapsProvider>
  )
}

export default BookCampForm
