import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { FiArrowLeft, FiSave } from 'react-icons/fi'
import type { DivisionTherapy, CreateDivisionPayload } from '@/types/crm.types'
import { DIVISION_THERAPY_LABEL } from '@/types/crm.types'
import { createDivisionSchema } from '@/features/crm/divisions/schemas/division.schemas'
import { useCreateDivision } from '@/features/crm/divisions/hooks/useCreateDivision'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useReshapingResolver } from '@/hooks/useReshapingResolver'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PasswordInput from '@/components/ui/PasswordInput'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import ChipPicker from '@/components/ui/ChipPicker'
import { toast } from '@/components/ui/sonner'

interface CreateDivisionModalProps {
  onClose: () => void
  /** Pre-selects the Company field when opened from a specific company's scoped Divisions view (?tenant=<id>) */
  defaultTenantId?: string
}

const THERAPY_OPTIONS = Object.keys(DIVISION_THERAPY_LABEL) as DivisionTherapy[]
const GENDER_OPTIONS: { value: 'male' | 'female' | 'other'; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

// Create-only (editing is on DivisionDetailPage) — Division Head is
// mandatory, the backend mints a new user + Role in the same transaction.
interface DivisionFormValues {
  tenant: string
  code: string
  name: string
  therapy: DivisionTherapy[]
  brandFocus: string
  mrCount: number
  headFirstName: string
  headLastName: string
  headEmail: string
  headPassword: string
  headPhone: string
  headGender: '' | 'male' | 'female' | 'other'
}

const EMPTY_FORM_VALUES: DivisionFormValues = {
  tenant: '',
  code: '',
  name: '',
  therapy: [],
  brandFocus: '',
  mrCount: 0,
  headFirstName: '',
  headLastName: '',
  headEmail: '',
  headPassword: '',
  headPhone: '',
  headGender: '',
}

// Maps the resolver's nested head.* error paths back to the form's flat headX fields.
const HEAD_FIELD_TO_FORM_FIELD: Record<string, keyof DivisionFormValues> = {
  firstName: 'headFirstName',
  lastName: 'headLastName',
  email: 'headEmail',
  password: 'headPassword',
  phone: 'headPhone',
  gender: 'headGender',
}

// valueAsNumber turns a cleared field into NaN, not undefined — treat NaN
// as "omit" so a blank optional field doesn't fail schema validation.
const useDivisionFormResolver = () =>
  useReshapingResolver<DivisionFormValues, CreateDivisionPayload>({
    schema: createDivisionSchema,
    toPayload: (values) => ({
      tenant: values.tenant,
      code: values.code,
      name: values.name,
      therapy: values.therapy,
      brandFocus: values.brandFocus || undefined,
      mrCount: Number.isNaN(values.mrCount) ? undefined : values.mrCount,
      head: {
        firstName: values.headFirstName,
        lastName: values.headLastName || undefined,
        email: values.headEmail,
        password: values.headPassword,
        phone: values.headPhone || undefined,
        gender: values.headGender || undefined,
      },
    }),
    nestedFieldMaps: { head: HEAD_FIELD_TO_FORM_FIELD },
  })

const CreateDivisionModal = ({ onClose, defaultTenantId }: CreateDivisionModalProps) => {
  const [step, setStep] = useState(0)
  // trigger() doesn't mark fields "touched", so without this a blind Next
  // click on a blank step 1 wouldn't show errors for untouched fields.
  const [step1Attempted, setStep1Attempted] = useState(false)
  const createDivision = useCreateDivision()
  const { resolver, parsePayload } = useDivisionFormResolver()

  const { data: tenantsData } = useTenants({ type: 'customer' })
  const tenants = (tenantsData?.data?.items ?? []).filter((t) => t.type !== 'platform')

  const {
    register,
    handleSubmit,
    control,
    reset,
    trigger,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<DivisionFormValues>({
    resolver,
    mode: 'onChange',
    defaultValues: { ...EMPTY_FORM_VALUES, tenant: defaultTenantId ?? '' },
  })

  const fieldError = (field: keyof DivisionFormValues) =>
    (touchedFields[field] || isSubmitted || step1Attempted) ? errors[field]?.message : undefined

  const resetAndClose = () => {
    reset({ ...EMPTY_FORM_VALUES, tenant: defaultTenantId ?? '' })
    setStep(0)
    setStep1Attempted(false)
    createDivision.reset()
    onClose()
  }

  // Only validates step-1 fields so step-2's still-empty head fields don't block Next.
  const handleNext = async () => {
    setStep1Attempted(true)
    const valid = await trigger(['tenant', 'code', 'name', 'therapy'])
    if (valid) setStep(1)
  }

  const onSubmit = async (values: DivisionFormValues) => {
    const payload = await parsePayload(values)
    createDivision.mutate(payload, {
      onSuccess: () => {
        toast.success('Division created')
        resetAndClose()
      },
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) resetAndClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>New division</DialogTitle>
          <DialogDescription>
            {step === 0 ? 'Step 1 of 2 — division details.' : 'Step 2 of 2 — registers the division head.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {step === 0 && (
              <>
                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Company *
                  </Label>
                  <Controller
                    control={control}
                    name="tenant"
                    render={({ field }) => (
                      <Select key={field.value || 'empty'} value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? '')}>
                        <SelectTrigger className="w-full text-[13px]">
                          <SelectValue placeholder="Select company...">
                            {(v: string) => tenants.find((t) => t.id === v)?.name ?? 'Select company...'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {fieldError('tenant') && <p className="text-[11px] mt-1 text-danger">{fieldError('tenant')}</p>}
                </div>

                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Code *
                  </Label>
                  <Input type="text" placeholder="e.g. cardio1" className="text-[13px]" {...register('code')} />
                  {fieldError('code') && <p className="text-[11px] mt-1 text-danger">{fieldError('code')}</p>}
                </div>

                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Name *
                  </Label>
                  <Input type="text" placeholder="e.g. Cardiology Division" className="text-[13px]" {...register('name')} />
                  {fieldError('name') && <p className="text-[11px] mt-1 text-danger">{fieldError('name')}</p>}
                </div>

                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Therapy areas *
                  </Label>
                  <Controller
                    control={control}
                    name="therapy"
                    render={({ field }) => (
                      <ChipPicker
                        options={THERAPY_OPTIONS}
                        selected={field.value}
                        onChange={(v) => field.onChange(v as DivisionTherapy[])}
                        placeholder="Add a therapy area..."
                        labelFor={(v) => DIVISION_THERAPY_LABEL[v as DivisionTherapy]}
                      />
                    )}
                  />
                  {fieldError('therapy') && <p className="text-[11px] mt-1 text-danger">{fieldError('therapy')}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                      Brand focus
                    </Label>
                    <Input type="text" className="text-[13px]" {...register('brandFocus')} />
                  </div>
                  <div>
                    <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                      MR count
                    </Label>
                    <Input type="number" className="text-[13px]" {...register('mrCount', { valueAsNumber: true })} />
                    {fieldError('mrCount') && <p className="text-[11px] mt-1 text-danger">{fieldError('mrCount')}</p>}
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                      First name *
                    </Label>
                    <Input type="text" className="text-[13px]" {...register('headFirstName')} />
                    {fieldError('headFirstName') && <p className="text-[11px] mt-1 text-danger">{fieldError('headFirstName')}</p>}
                  </div>
                  <div>
                    <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                      Last name
                    </Label>
                    <Input type="text" className="text-[13px]" {...register('headLastName')} />
                  </div>
                </div>

                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Email *
                  </Label>
                  <Input type="email" className="text-[13px]" {...register('headEmail')} />
                  {fieldError('headEmail') && <p className="text-[11px] mt-1 text-danger">{fieldError('headEmail')}</p>}
                </div>

                <div>
                  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Password *
                  </Label>
                  <PasswordInput className="text-[13px]" {...register('headPassword')} />
                  {fieldError('headPassword') && <p className="text-[11px] mt-1 text-danger">{fieldError('headPassword')}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                      Phone
                    </Label>
                    <Input type="text" className="text-[13px]" {...register('headPhone')} />
                  </div>
                  <div>
                    <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                      Gender
                    </Label>
                    <Controller
                      control={control}
                      name="headGender"
                      render={({ field }) => (
                        <Select key={field.value || 'empty'} value={field.value || undefined} onValueChange={(v) => field.onChange((v ?? '') as DivisionFormValues['headGender'])}>
                          <SelectTrigger className="w-full text-[13px]">
                            <SelectValue placeholder="Select...">
                              {(v: string) => GENDER_OPTIONS.find((g) => g.value === v)?.label ?? 'Select...'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {GENDER_OPTIONS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            {createDivision.isError && (
              <p className="text-[12px] text-danger">
                {(createDivision.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                  'Could not create the division — try again.'}
              </p>
            )}
          </div>

          <DialogFooter className="mt-4">
            {step === 0 ? (
              <>
                <Button type="button" variant="secondary" onClick={resetAndClose}>Cancel</Button>
                <Button type="button" onClick={handleNext} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
                  Next
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={() => setStep(0)} disabled={createDivision.isPending}>
                  <FiArrowLeft size={14} /> Back
                </Button>
                <Button type="submit" disabled={createDivision.isPending} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
                  <FiSave size={14} /> {createDivision.isPending ? 'Creating…' : 'Create division'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateDivisionModal
