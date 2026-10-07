import { useEffect, useRef, useState } from 'react'
import { FiUser, FiMapPin, FiUserCheck, FiCalendar, FiFileText, FiAlertTriangle } from 'react-icons/fi'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useReshapingResolver } from '@/hooks/useReshapingResolver'
import { bookCampPayloadSchema, type BookCampFormPayload } from '@/features/pharma/schemas/bookCamp.schemas'
import { useBookCamp } from '@/features/camps/hooks/useBookCamp'
import { useDayRangeAvailability } from '@/features/camps/hooks/useDayRangeAvailability'
import { usePermission } from '@/hooks/usePermission'
import { getApiErrorMessage } from '@/utils/apiError'
import { haversineDistanceKm } from '@/utils/geo'
import type { BookCampPayload, CampMutationResponseEntity, CampType } from '@/types/campReal.types'
import type { ApiResponse } from '@/types/common.types'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import type { LocationValue } from '@/types/location.types'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'
import type { DoctorEntity } from '@/types/doctor.types'
import { DOCTOR_RANGE_KM } from '@/types/doctor.types'
import DoctorDistancePicker from '@/features/pharma/components/DoctorDistancePicker'
import DoctorNameDivisionPicker from '@/features/pharma/components/DoctorNameDivisionPicker'
import MrPicker from '@/features/pharma/components/MrPicker'
import { EditDoctorModal } from '@/features/doctors'
import DayStripAvailability from '@/features/pharma/components/DayStripAvailability'
import LocationPicker from '@/components/widgets/location-picker/LocationPicker'
import LocationAddressFields from '@/components/widgets/location-picker/LocationAddressFields'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import SectionHeader from '@/components/ui/SectionHeader'
import FieldErrorText from '@/components/ui/FieldErrorText'

interface FormValues {
  mrId: string
  mrLabel: string
  doctorId: string
  doctorLabel: string
  date: string
  timeSlot: CampTimeSlotValue | ''
  location: LocationValue | null
  notes: string
  // devices: string — needs InventoryMaster ObjectIds, not free text; not re-approved for this form yet.
}

const EMPTY_FORM_VALUES: FormValues = {
  mrId: '', mrLabel: '',
  doctorId: '', doctorLabel: '',
  date: '',
  timeSlot: '',
  location: null,
  notes: '',
}

// selfMrId is spliced in as `mr` when the caller IS the MR.
const useBookCampFormResolver = (needsMrPicker: boolean, selfMrId: string | undefined, type: CampType, patientExpectation: number | undefined) =>
  useReshapingResolver<FormValues, BookCampFormPayload>({
    schema: bookCampPayloadSchema,
    toPayload: (values) => ({
      // '' rather than undefined, so Zod's min(1)/enum checks give a friendly required message.
      mr: ((needsMrPicker ? values.mrId : selfMrId) || '') as string,
      doctor: values.doctorId,
      type,
      patientExpectation,
      date: values.date,
      timeSlot: (values.timeSlot || '') as CampTimeSlotValue,
      location: values.location as LocationValue,
      notes: values.notes.trim() || undefined,
      devices: undefined,
    }),
    // Maps payload keys to this form's differently-named fields, so a Zod error lands on the right field.
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

// Shared across 3 pharma portal entry pages — only whether the MR picker renders differs per role.
const BookCampForm = ({ needsMrPicker, type, project, patientExpectation, patientExpectationInvalid, onBooked, onCancel }: BookCampFormProps) => {
  const { session, hasPermission } = usePermission()
  const selfMrId = session?.role.id
  const canManageDoctors = hasPermission('doctor:manage')
  const [showNewDoctor, setShowNewDoctor] = useState(false)
  // A null type is just a resolver placeholder ('screening') — onSubmit's project-required guard blocks submit.
  const { resolver, parsePayload } = useBookCampFormResolver(needsMrPicker, selfMrId, type ?? 'screening', patientExpectation)
  const bookCamp = useBookCamp()
  // Closes the race window before isPending flips true, since parsePayload's re-parse runs first.
  const submittingRef = useRef(false)
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationHint, setLocationHint] = useState<string | null>(null)

  // Doctor search (both the division name-search and /doctors/nearest) scopes to the CALLING
  // session's own division, not the picked MR's — they can drift.
  const [mrDivisionId, setMrDivisionId] = useState<string | null>(null)
  const actingDivisionId = session?.role.division ?? null
  const doctorDivisionId = mrDivisionId ?? actingDivisionId

  // The picked doctor's OWN location, captured at pick time — the camp location defaults to this.
  // Once the doctor is cleared (or location is manually pushed out of range) this is cleared too.
  const [doctorLocation, setDoctorLocation] = useState<LocationValue | null>(null)
  // Set once a manual location edit pushes the already-picked doctor more than DOCTOR_RANGE_KM
  // away — switches the Doctor section into "out of range, re-pick" mode (distance-sorted,
  // scoped to the NEW location) instead of silently keeping a doctor who can't serve this camp.
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
  const watchedMrId = useWatch({ control, name: 'mrId' })
  const mrLabel = useWatch({ control, name: 'mrLabel' })
  const doctorLabel = useWatch({ control, name: 'doctorLabel' })
  const location = useWatch({ control, name: 'location' })
  const watchedDate = useWatch({ control, name: 'date' })
  const watchedTimeSlot = useWatch({ control, name: 'timeSlot' })

  const mrDivisionMismatch = needsMrPicker && !!watchedMrId && (mrDivisionId === null || mrDivisionId !== actingDivisionId)

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
    // Defaults the camp location to the doctor's own address — still fully editable afterwards.
    // Goes straight through setValue, NOT handleLocationChange below — this is the doctor-driven
    // default itself, so it must never immediately re-trigger its own out-of-range check.
    setValue('location', doctor.location, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }

  // Shared by both the map picker and the manual address fields — whichever one the user actually
  // used to change the location. Only a call to THIS function (never handleSelectDoctor's direct
  // setValue above) re-checks the picked doctor's range, since only this path is a genuine
  // user-driven location edit.
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
  const missingSelfMrId = !needsMrPicker && !selfMrId

  const onSubmit = async (values: FormValues) => {
    // Should be unreachable (submit is disabled on all of these) — guards a stray Enter-key submit.
    if (!project || !type || patientExpectationInvalid || availabilityIndeterminate) return
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
    // project is context, not form state, so it's added here rather than via the resolver.
    const payload: BookCampPayload = { ...formPayload, project: project.id }
    const res = await bookCamp.mutateAsync(payload)
    reset(EMPTY_FORM_VALUES)
    setMrDivisionId(null)
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

  // Continues MrBookCampTab's "1 · Project & camp" numbering.
  const mrSectionNumber = 2
  const doctorSectionNumber = needsMrPicker ? 3 : 2
  const locationSectionNumber = doctorSectionNumber + 1
  const dateSectionNumber = locationSectionNumber + 1
  const notesSectionNumber = dateSectionNumber + 1

  return (
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

      {needsMrPicker && (
        <div className="booking-section">
          <SectionHeader icon={FiUser} spaced={false} number={mrSectionNumber}>MR</SectionHeader>
          <Controller
            control={control}
            name="mrId"
            render={({ field }) => (
              <MrPicker
                value={field.value}
                label={mrLabel}
                onChange={(id, l, divisionId) => {
                  field.onChange(id)
                  setValue('mrLabel', l)
                  setMrDivisionId(divisionId)
                  // A newly-picked MR may resolve to a different division — the old doctor pick could be stale.
                  setValue('doctorId', '', { shouldDirty: true })
                  setValue('doctorLabel', '')
                  setDoctorLocation(null)
                  setDoctorOutOfRange(false)
                }}
              />
            )}
          />
          {fieldError('mrId') && <p className="text-[11px] mt-1 text-danger">{fieldError('mrId')}</p>}
        </div>
      )}

      <div className="booking-section">
        <SectionHeader icon={FiUserCheck} spaced={needsMrPicker} number={doctorSectionNumber}>Doctor</SectionHeader>
        {!projectReady ? (
          <p className="text-[13px] rounded-lg px-3 py-2 bg-muted/50" style={{ color: 'var(--qms-text-muted)' }}>
            Select a project and camp type above first.
          </p>
        ) : mrDivisionMismatch ? (
          <div className="text-[12px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger">
            {mrDivisionId === null
              ? "Can't confirm this MR's division — doctor search may not be accurate for this booking."
              : "This MR's division doesn't match your own — doctor search is scoped to your division and may not be accurate for this booking."}
          </div>
        ) : (
          <div className="space-y-1.5">
            {doctorOutOfRange && (
              <div className="flex items-start gap-1.5 text-[12px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger">
                <FiAlertTriangle size={13} className="mt-0.5 shrink-0" />
                <span>The previously picked doctor isn't within {DOCTOR_RANGE_KM}km of this camp location — pick a doctor near the new location instead.</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
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
                        disabled={!projectReady || !locationReady}
                      />
                    ) : (
                      <DoctorNameDivisionPicker
                        value={field.value}
                        label={doctorLabel}
                        division={doctorDivisionId}
                        onChange={(id, l) => { field.onChange(id); setValue('doctorLabel', l) }}
                        onSelectDoctor={handleSelectDoctor}
                        disabled={!projectReady}
                      />
                    )
                  }
                />
              </div>
              {/* No "New doctor" button when the acting user has no division — the create would just 403. */}
              {canManageDoctors && session && actingDivisionId && (
                <Button type="button" variant="outline" disabled={!projectReady} onClick={() => setShowNewDoctor(true)}>
                  New doctor
                </Button>
              )}
            </div>
          </div>
        )}
        {fieldError('doctorId') && <p className="text-[11px] mt-1 text-danger">{fieldError('doctorId')}</p>}

        {showNewDoctor && session && actingDivisionId && (
          <EditDoctorModal
            open
            doctor={null}
            forcedTenant={{ id: session.tenant.id, label: session.tenant.name }}
            forcedDivision={{ id: actingDivisionId, label: 'Your assigned division', note: 'locked to your account' }}
            onCreated={(created) => {
              setValue('doctorId', created.id, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
              setValue('doctorLabel', `${created.name} (${created.pharmaCode})`)
              handleSelectDoctor(created)
            }}
            onClose={() => setShowNewDoctor(false)}
          />
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
            disabled={!projectReady || bookCamp.isPending || missingSelfMrId || locationResolution === 'loading' || mrDivisionMismatch || !!patientExpectationInvalid || availabilityIndeterminate}
            className="font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            {bookCamp.isPending ? 'Booking…' : locationResolution === 'loading' ? 'Resolving location…' : 'Book camp'}
          </Button>
        </div>
      </div>
    </form>
  )
}

export default BookCampForm
