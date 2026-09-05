import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/ui/FieldLabel'
import DatePicker from '@/components/ui/DatePicker'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'
import { useCreatePatient } from '@/features/clinical/patient/hooks/useCreatePatient'
import { PATIENT_GENDER_LABEL, type PatientEntity, type PatientGender } from '@/features/clinical/patient/patient.types'

const GENDER_OPTIONS = Object.keys(PATIENT_GENDER_LABEL) as PatientGender[]

const registrationSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  middleName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  dateOfBirth: z.string().trim().min(1, 'Date of birth is required'),
  gender: z.enum(GENDER_OPTIONS as [PatientGender, ...PatientGender[]], { error: 'Gender is required' }),
  // Digits-only, not just length: a non-numeric value would pass a bare
  // .min(10) but then become permanently unsearchable by mobile (the picker's
  // search only routes a purely-numeric string to mobile search).
  mobile: z.string().trim().min(10, 'Mobile must be at least 10 digits').regex(/^\d+$/, 'Mobile must contain only digits'),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
})

type RegistrationFormValues = z.infer<typeof registrationSchema>

interface PatientRegistrationFormProps {
  open: boolean
  onClose: () => void
  onCreated: (patient: PatientEntity) => void
}

// Address is deliberately omitted from this quick-register flow — optional
// on the backend, can be added later via a full edit.
const PatientRegistrationForm = ({ open, onClose, onCreated }: PatientRegistrationFormProps) => {
  const createMutation = useCreatePatient()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: 'onChange',
    defaultValues: { firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: undefined, mobile: '', email: '' },
  })

  const fieldError = (field: keyof RegistrationFormValues) => (touchedFields[field] || isSubmitted ? errors[field]?.message : undefined)

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = (values: RegistrationFormValues) => {
    createMutation.mutate(
      {
        firstName: values.firstName,
        middleName: values.middleName || undefined,
        lastName: values.lastName || undefined,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        mobile: values.mobile,
        email: values.email || undefined,
      },
      {
        onSuccess: (res) => {
          if (res.data) onCreated(res.data)
          handleClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Register new patient</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <FieldLabel htmlFor="patient-reg-first-name">First name *</FieldLabel>
              <Input id="patient-reg-first-name" type="text" className="text-[13px]" {...register('firstName')} />
              {fieldError('firstName') && <p className="text-[11px] mt-1 text-danger">{fieldError('firstName')}</p>}
            </div>
            <div>
              <FieldLabel htmlFor="patient-reg-last-name">Last name</FieldLabel>
              <Input id="patient-reg-last-name" type="text" className="text-[13px]" {...register('lastName')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <FieldLabel htmlFor="patient-reg-dob">Date of birth *</FieldLabel>
              <Controller
                control={control}
                name="dateOfBirth"
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    className="w-full"
                  />
                )}
              />
              {fieldError('dateOfBirth') && <p className="text-[11px] mt-1 text-danger">{fieldError('dateOfBirth')}</p>}
            </div>
            <div>
              <FieldLabel htmlFor="patient-reg-gender">Gender *</FieldLabel>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger id="patient-reg-gender" className="w-full text-[13px]">
                      <SelectValue>{() => (field.value ? PATIENT_GENDER_LABEL[field.value] : 'Select gender')}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((g) => <SelectItem key={g} value={g}>{PATIENT_GENDER_LABEL[g]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {fieldError('gender') && <p className="text-[11px] mt-1 text-danger">{fieldError('gender')}</p>}
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="patient-reg-mobile">Mobile *</FieldLabel>
            <Input id="patient-reg-mobile" type="tel" className="text-[13px]" {...register('mobile')} />
            {fieldError('mobile') && <p className="text-[11px] mt-1 text-danger">{fieldError('mobile')}</p>}
          </div>

          <div>
            <FieldLabel htmlFor="patient-reg-email">Email</FieldLabel>
            <Input id="patient-reg-email" type="email" className="text-[13px]" {...register('email')} />
            {fieldError('email') && <p className="text-[11px] mt-1 text-danger">{fieldError('email')}</p>}
          </div>

          <MutationStatusBanner mutation={createMutation} errorFallback="Could not register this patient — try again." showSuccess={false} />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Registering…' : 'Register patient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default PatientRegistrationForm
