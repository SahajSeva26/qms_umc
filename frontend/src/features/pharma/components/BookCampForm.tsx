import { useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { FiCheckCircle } from 'react-icons/fi'
import { useReshapingResolver } from '@/hooks/useReshapingResolver'
import { bookCampPayloadSchema } from '@/features/pharma/schemas/bookCamp.schemas'
import { useBookCamp } from '@/features/camps/hooks/useBookCamp'
import { getApiErrorMessage } from '@/utils/apiError'
import type { BookCampPayload, CampType } from '@/types/campReal.types'
import DoctorPicker from '@/features/pharma/components/DoctorPicker'
import MrPicker from '@/features/pharma/components/MrPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  startTime: string
  endTime: string
  city: string
  state: string
  lng: number
  lat: number
  notes: string
  // Comma-separated free text, same convention as CampDetailPageReal.tsx —
  // split/trimmed/filtered into a string[] in toPayload.
  devices: string
}

const EMPTY_FORM_VALUES: FormValues = {
  mrId: '', mrLabel: '',
  doctorId: '', doctorLabel: '',
  type: '',
  patientExpectation: NaN,
  date: '',
  startTime: '', endTime: '',
  city: '', state: '',
  lng: NaN, lat: NaN,
  notes: '',
  devices: '',
}

const useBookCampFormResolver = (mrRequired: boolean) =>
  useReshapingResolver<FormValues, BookCampPayload>({
    schema: bookCampPayloadSchema(mrRequired),
    toPayload: (values) => ({
      mr: values.mrId || undefined,
      doctor: values.doctorId,
      type: values.type || undefined,
      // valueAsNumber turns a cleared field into NaN, not undefined — treat
      // NaN as "omit this field" while still preserving a genuine 0.
      patientExpectation: Number.isNaN(values.patientExpectation) ? undefined : values.patientExpectation,
      date: values.date,
      timeSlot: { start: values.startTime, end: values.endTime },
      city: values.city,
      state: values.state,
      coordinates: [values.lng, values.lat],
      notes: values.notes || undefined,
      devices: (() => {
        const list = values.devices.split(',').map((d) => d.trim()).filter(Boolean)
        return list.length > 0 ? list : undefined
      })(),
      // conscentPath deliberately omitted — it's a path to an already-
      // uploaded consent file, and no upload UI/infra exists anywhere in
      // this app to produce one yet. Revisit once that flow exists.
    }),
    // timeSlot/coordinates are nested (object/tuple) in the payload but flat
    // in the form — without these maps, a validation error would land on a
    // form field ('timeSlot'/'coordinates') that doesn't exist and silently
    // never render. zodResolver reports a tuple error as an array, keyed by
    // numeric-string index ('0'/'1'), confirmed empirically.
    nestedFieldMaps: {
      timeSlot: { start: 'startTime', end: 'endTime' },
      coordinates: { '0': 'lng', '1': 'lat' },
    },
    // Payload's `mr` (from the top-level .refine() conditional-required
    // check) -> form's own `mrId` field.
    topLevelFieldMap: { mr: 'mrId' },
  })

interface BookCampFormProps {
  /** Whether this role books on behalf of someone else — shows the MR picker. MR itself never does. */
  needsMrPicker: boolean
}

// Shared across all 4 pharma portal pages — the only thing that differs per
// role is whether the MR picker renders (MR books for self; HO/RSM/ASM name
// a downline MR). The submitted payload is identical either way.
const BookCampForm = ({ needsMrPicker }: BookCampFormProps) => {
  const { resolver, parsePayload } = useBookCampFormResolver(needsMrPicker)
  const bookCamp = useBookCamp()
  const [bookedCode, setBookedCode] = useState<string | null>(null)
  // bookCamp.isPending only flips true once mutate/mutateAsync is actually
  // called — but parsePayload's own async Zod re-parse runs BEFORE that, so
  // two very fast clicks can both slip through isPending's guard and race
  // each other into a live booking call. This ref is set synchronously at
  // the top of onSubmit, before any await, closing that window — booking is
  // operationally significant and the backend has no idempotency guard.
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

  const onSubmit = async (values: FormValues) => {
    const payload = await parsePayload(values)
    const res = await bookCamp.mutateAsync(payload)
    setBookedCode(res.data?.code ?? null)
    reset(EMPTY_FORM_VALUES)
  }

  // The React Compiler flags ANY function passed into RHF's handleSubmit()
  // that reads a ref, wherever that call happens — it can't statically
  // prove the read only happens from a real submit event. So the ref guard
  // can't live inside handleSubmit's callback at all; it has to wrap the
  // callback's INVOCATION instead. This plain (non-RHF) form submit handler
  // checks the ref first, then hands off to RHF's own validated submit.
  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    handleSubmit(onSubmit)(event)
      .catch(() => {})
      .finally(() => { submittingRef.current = false })
  }

  const bookAnother = () => {
    setBookedCode(null)
    bookCamp.reset()
  }

  // Pharma roles have no camp:search/camp:get today — never navigate to a
  // camp detail/list page here, it would just 403. Show a receipt in place
  // instead.
  if (bookedCode) {
    return (
      <div className="text-center py-8">
        <div className="bg-success-soft mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
          <FiCheckCircle size={26} className="text-success" />
        </div>
        <h2 className="text-lg font-bold mb-2 text-qms-text">Camp requested</h2>
        <p className="text-[13px] mb-1 text-qms-text-muted">Your camp has been submitted for confirmation.</p>
        <p className="text-[13px] mb-6 font-mono font-semibold text-qms-text">{bookedCode}</p>
        <Button onClick={bookAnother} className="w-full">Book another camp</Button>
      </div>
    )
  }

  return (
    <form onSubmit={onFormSubmit} className="space-y-4" noValidate>
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="bookCampStartTime" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Start time *</Label>
          <Input id="bookCampStartTime" type="time" className="text-[13px]" {...register('startTime')} />
          {fieldError('startTime') && <p className="text-[11px] mt-1 text-danger">{fieldError('startTime')}</p>}
        </div>
        <div>
          <Label htmlFor="bookCampEndTime" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">End time *</Label>
          <Input id="bookCampEndTime" type="time" className="text-[13px]" {...register('endTime')} />
          {fieldError('endTime') && <p className="text-[11px] mt-1 text-danger">{fieldError('endTime')}</p>}
        </div>
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

      <div>
        <Label htmlFor="bookCampDevices" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Devices</Label>
        <Input id="bookCampDevices" className="text-[13px]" placeholder="e.g. bp-monitor, glucometer" {...register('devices')} />
      </div>

      <div>
        <Label htmlFor="bookCampNotes" className="text-[10px] font-semibold tracking-widest uppercase mb-1.5 block text-qms-text-muted">Notes</Label>
        <Textarea id="bookCampNotes" className="text-[13px]" placeholder="Optional" {...register('notes')} />
      </div>

      {bookCamp.isError && (
        <div className="text-[12px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger">
          {getApiErrorMessage(bookCamp.error, 'Could not book this camp — try again.')}
        </div>
      )}

      <Button
        type="submit"
        disabled={bookCamp.isPending}
        className="w-full font-bold text-white"
        style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
      >
        {bookCamp.isPending ? 'Booking…' : 'Book camp'}
      </Button>
    </form>
  )
}

export default BookCampForm
