import { useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useReshapingResolver } from '@/hooks/useReshapingResolver'
import { bookCampPayloadSchema, type BookCampFormPayload } from '@/features/pharma/schemas/bookCamp.schemas'
import { useBookCamp } from '@/features/camps/hooks/useBookCamp'
import { useSession } from '@/hooks/useSession'
import { getApiErrorMessage } from '@/utils/apiError'
import type { BookCampPayload, CampMutationResponseEntity, CampType } from '@/types/campReal.types'
import type { ApiResponse } from '@/types/common.types'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import DoctorPicker from '@/features/pharma/components/DoctorPicker'
import MrPicker from '@/features/pharma/components/MrPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
// import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

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
  city: string
  state: string
  lng: number
  lat: number
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
  city: '', state: '',
  lng: NaN, lat: NaN,
  // notes: '',
  // devices: '',
}

// selfMrId: the booking session's own role id — spliced in as `mr` when the
// caller IS the MR (needsMrPicker false), since the schema requires `mr`
// unconditionally but an MR's form never shows/populates the mrId field.
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
      city: values.city,
      state: values.state,
      coordinates: [values.lng, values.lat],
      notes: undefined,
      devices: undefined,
      // conscentPath omitted — no consent-file upload UI/infra exists yet.
    }),
    // Payload's `mr` (from the top-level .refine()) -> form's `mrId`.
    topLevelFieldMap: { mr: 'mrId' },
  })

interface BookCampFormProps {
  /** Whether this role books on behalf of someone else — shows the MR picker. MR itself never does. */
  needsMrPicker: boolean
  /** Locked context from the caller's page, never user-editable — spliced into the payload before the mutation fires; the form/schema never see it. */
  project: { id: string; name: string; campTimeSlots: CampTimeSlotValue[] }
  /** Called once the mutation succeeds, with the created camp — the parent (a
   * dialog over the project's camp list) closes and refetches. */
  onBooked: (camp: ApiResponse<CampMutationResponseEntity>) => void
}

// Shared across all 4 pharma portal pages — only whether the MR picker
// renders differs per role; the submitted payload is identical either way.
const BookCampForm = ({ needsMrPicker, project, onBooked }: BookCampFormProps) => {
  const { session } = useSession()
  const selfMrId = session?.role.id
  const { resolver, parsePayload } = useBookCampFormResolver(needsMrPicker, selfMrId)
  const bookCamp = useBookCamp()
  // isPending flips true only once mutate is called, but parsePayload's own
  // re-parse runs before that — this ref closes that race window synchronously.
  const submittingRef = useRef(false)

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
  // useWatch, not watch() — watch() returns a function React Compiler can't
  // memoize safely and skips optimizing this whole component for.
  const mrLabel = useWatch({ control, name: 'mrLabel' })
  const doctorLabel = useWatch({ control, name: 'doctorLabel' })

  const fieldError = (field: keyof FormValues) =>
    (touchedFields[field] || isSubmitted) ? errors[field]?.message : undefined

  // A real MR booking for themselves needs no picker, but the schema still
  // requires `mr` — this state should be unreachable for a genuine pharma MR
  // session; if it happens anyway, fail safely instead of submitting `mr: undefined`.
  const missingSelfMrId = !needsMrPicker && !selfMrId

  const onSubmit = async (values: FormValues) => {
    const formPayload = await parsePayload(values)
    // project is context, not form state — assembled here, never claimed as
    // the resolver's own output type (see BookCampFormPayload).
    const payload: BookCampPayload = { ...formPayload, project: project.id }
    const res = await bookCamp.mutateAsync(payload)
    reset(EMPTY_FORM_VALUES)
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
        <Controller
          control={control}
          name="doctorId"
          render={({ field }) => (
            <DoctorPicker value={field.value} label={doctorLabel} onChange={(id, l) => { field.onChange(id); setValue('doctorLabel', l) }} />
          )}
        />
        {fieldError('doctorId') && <p className="text-[11px] mt-1 text-danger">{fieldError('doctorId')}</p>}
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="bookCampDate" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Date *</Label>
          <Input id="bookCampDate" type="date" className="text-[13px]" {...register('date')} />
          {fieldError('date') && <p className="text-[11px] mt-1 text-danger">{fieldError('date')}</p>}
        </div>
        <div>
          <Label htmlFor="bookCampPatientExpectation" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Patients expected</Label>
          <Input id="bookCampPatientExpectation" type="number" className="text-[13px]" {...register('patientExpectation', { valueAsNumber: true })} />
          {fieldError('patientExpectation') && <p className="text-[11px] mt-1 text-danger">{fieldError('patientExpectation')}</p>}
        </div>
      </div>

      <div>
        <Label className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Time slot *</Label>
        <Controller
          control={control}
          name="timeSlot"
          render={({ field }) => (
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select time slot…" /></SelectTrigger>
              <SelectContent>
                {project.campTimeSlots.map((slot) => <SelectItem key={slot} value={slot}>{CAMP_TIME_SLOT_LABEL[slot]}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
        {fieldError('timeSlot') && <p className="text-[11px] mt-1 text-danger">{fieldError('timeSlot')}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="bookCampCity" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">City *</Label>
          <Input id="bookCampCity" type="text" className="text-[13px]" {...register('city')} />
          {fieldError('city') && <p className="text-[11px] mt-1 text-danger">{fieldError('city')}</p>}
        </div>
        <div>
          <Label htmlFor="bookCampState" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">State *</Label>
          <Input id="bookCampState" type="text" className="text-[13px]" {...register('state')} />
          {fieldError('state') && <p className="text-[11px] mt-1 text-danger">{fieldError('state')}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="bookCampLng" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Longitude *</Label>
          <Input id="bookCampLng" type="number" step="any" className="text-[13px]" {...register('lng', { valueAsNumber: true })} />
          {fieldError('lng') && <p className="text-[11px] mt-1 text-danger">{fieldError('lng')}</p>}
        </div>
        <div>
          <Label htmlFor="bookCampLat" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Latitude *</Label>
          <Input id="bookCampLat" type="number" step="any" className="text-[13px]" {...register('lat', { valueAsNumber: true })} />
          {fieldError('lat') && <p className="text-[11px] mt-1 text-danger">{fieldError('lat')}</p>}
        </div>
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

      <Button
        type="submit"
        disabled={bookCamp.isPending || missingSelfMrId}
        className="w-full font-bold text-white"
        style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
      >
        {bookCamp.isPending ? 'Booking…' : 'Book camp'}
      </Button>
    </form>
  )
}

export default BookCampForm
