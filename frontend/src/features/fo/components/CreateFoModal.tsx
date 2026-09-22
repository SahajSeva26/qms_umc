import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { FiArrowLeft, FiPlus } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import FieldLabel from '@/components/ui/FieldLabel'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'
import { toast } from '@/components/ui/sonner'
import RoleUserSection from '@/features/access-management/role/components/RoleUserSection'
import { useCreateRole } from '@/features/access-management/role/hooks/useCreateRole'
import {
  useCreateRoleFormResolver,
  toCreateRolePayload,
  EMPTY_CREATE_FORM_VALUES,
  type CreateRoleFormValues,
} from '@/features/access-management/role/roleForm'

interface CreateFoModalProps {
  // Required, not optional — this form's hidden tenant/roleType values are
  // baked into useForm's defaultValues at first mount (React Hook Form never
  // re-reads defaultValues later), so the caller must not render this
  // component at all until both ids are real, resolved strings.
  tenantId: string
  foTypeId: string
}

const STEP_TITLES = ['Role details', 'User account']

// Fields grouped by step, used to force "touched" only for a step's own
// fields once its Next/Create has been attempted — mirrors CreateRoleModal's
// own STEP_FIELD_NAMES/touchedOverrideFor pattern for a two-step form.
const STEP_FIELD_NAMES: (keyof CreateRoleFormValues)[][] = [
  ['code', 'name'],
  ['userFirstName', 'userLastName', 'userEmail', 'userPassword', 'userPhone', 'userGender'],
]

const touchedOverrideFor = (
  stepIndex: number,
  attempted: boolean,
  realTouched: Partial<Record<keyof CreateRoleFormValues, boolean>>,
): Partial<Record<keyof CreateRoleFormValues, boolean>> =>
  attempted
    ? { ...realTouched, ...Object.fromEntries(STEP_FIELD_NAMES[stepIndex].map((name) => [name, true])) }
    : realTouched

// Field officers are Roles of RoleType 'field-officer', which lives only
// under the platform tenant — unlike the generic CreateRoleModal (company +
// role-type picker + division/supervisor + permissions), every one of those
// is fixed here, so this is a two-step form covering just role identity
// (code/name/description) then the bound user's account fields.
const CreateFoModal = ({ tenantId, foTypeId }: CreateFoModalProps) => {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  // trigger() doesn't mark fields "touched", so without this a blind Next
  // click on a blank step wouldn't show errors for untouched fields.
  const [stepAttempted, setStepAttempted] = useState([false, false])
  const { resolver, parsePayload } = useCreateRoleFormResolver()

  const {
    register,
    handleSubmit,
    trigger,
    control,
    reset,
    formState: { errors, touchedFields },
  } = useForm<CreateRoleFormValues>({
    resolver,
    mode: 'onChange',
    defaultValues: { ...EMPTY_CREATE_FORM_VALUES, tenant: tenantId, roleType: foTypeId },
  })

  const createRole = useCreateRole()

  const resetAndClose = () => {
    reset({ ...EMPTY_CREATE_FORM_VALUES, tenant: tenantId, roleType: foTypeId })
    setStep(0)
    setStepAttempted([false, false])
    createRole.reset()
    setOpen(false)
  }

  const markStepAttempted = (index: number) => {
    setStepAttempted((prev) => prev.map((v, i) => (i === index ? true : v)))
  }

  const handleNext = async () => {
    markStepAttempted(0)
    const valid = await trigger(['code', 'name'])
    if (valid) setStep(1)
  }

  const handleBack = () => setStep(0)

  const onSubmit = async (values: CreateRoleFormValues) => {
    const parsed = await parsePayload(values)
    createRole.mutate(toCreateRolePayload(parsed, []), {
      onSuccess: () => {
        toast.success('Field officer added')
        resetAndClose()
      },
    })
  }

  // handleSubmit(onSubmit) only invokes its callback AFTER validation
  // succeeds — markStepAttempted must happen before that gate, or a blank
  // step-2 submit would never surface visible errors (same fix as the
  // single-step version's earlier submitAttempted timing bug).
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    markStepAttempted(1)
    void handleSubmit(onSubmit)(event)
  }

  const touchedFieldsForStep = (index: number) => touchedOverrideFor(index, stepAttempted[index], touchedFields)

  const showError = (name: 'code' | 'name') => touchedFieldsForStep(0)[name] && errors[name]

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <Button
        onClick={() => setOpen(true)}
        className="text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
      >
        <FiPlus size={14} /> Add FO
      </Button>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add field officer</DialogTitle>
          <DialogDescription>
            Step {step + 1} of 2 — {STEP_TITLES[step]}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} noValidate>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {step === 0 && (
              <div className="rounded-xl border p-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
                <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Role details</h2>
                <div className="space-y-4">
                  <div>
                    <FieldLabel htmlFor="code">Code</FieldLabel>
                    <Input id="code" type="text" placeholder="e.g. fo-ravi-kumar" {...register('code')} />
                    {showError('code') && <p className="text-xs text-danger mt-1.5">{errors.code?.message}</p>}
                  </div>
                  <div>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input id="name" type="text" {...register('name')} />
                    {showError('name') && <p className="text-xs text-danger mt-1.5">{errors.name?.message}</p>}
                  </div>
                  <div>
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Textarea id="description" placeholder="Optional" {...register('description')} />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <>
                <RoleUserSection
                  mode="create"
                  register={register}
                  control={control}
                  errors={errors}
                  touchedFields={touchedFieldsForStep(1)}
                />
                <MutationStatusBanner mutation={createRole} showSuccess={false} />
              </>
            )}
          </div>

          <DialogFooter className="mt-4">
            {step === 0 && (
              <>
                <Button type="button" variant="outline" onClick={resetAndClose}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleNext}>Next</Button>
              </>
            )}
            {step === 1 && (
              <>
                <Button type="button" variant="outline" onClick={handleBack} disabled={createRole.isPending}>
                  <FiArrowLeft size={14} /> Back
                </Button>
                <Button type="submit" disabled={createRole.isPending}>
                  {createRole.isPending ? 'Creating…' : 'Create'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateFoModal
