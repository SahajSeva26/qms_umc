import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { FiArrowLeft, FiPlus } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import FieldLabel from '@/components/ui/FieldLabel'
import { Input } from '@/components/ui/input'
import { SegRow, SegButton } from '@/components/ui/SegButton'
import RoleUserSection from '@/features/access-management/role/components/RoleUserSection'
import { useCreateRoleFormResolver, EMPTY_CREATE_FORM_VALUES, type CreateRoleFormValues } from '@/features/access-management/role/roleForm'
import { useEmployeeFieldsResolver, EMPTY_EMPLOYEE_FIELDS_VALUES, toEmployeeFieldsPayload } from '@/features/access-management/employee/employeeForm'
import EmployeeFieldsSection from '@/features/access-management/employee/components/EmployeeFieldsSection'
import ExistingFieldOfficerPicker, { type PickedFieldOfficer } from '@/features/access-management/employee/components/ExistingFieldOfficerPicker'
import { useOnboardFieldOfficer } from '@/features/access-management/employee/hooks/useOnboardFieldOfficer'
import { useCreateEmployee } from '@/features/access-management/employee/hooks/useCreateEmployee'
import { EMPLOYEE_ROUTES } from '@/features/access-management/employee/employee.routes'
import type { EmployeeFieldsValues } from '@/features/access-management/employee/schemas/employee.schemas'
import type { CreateRolePayload } from '@/types/accessManagement.types'
import { getApiErrorMessage } from '@/utils/apiError'

type Mode = 'new' | 'existing'
type WorkerKind = 'field-officer' | 'dietitian'

const WORKER_KIND_LABEL: Record<WorkerKind, string> = {
  'field-officer': 'Field officer',
  dietitian: 'Dietitian',
}

interface CreateEmployeeModalProps {
  tenantId: string
  /** RoleType id for each onboardable worker kind — undefined kinds are not offered. */
  roleTypeIds: Partial<Record<WorkerKind, string>>
  canOnboardNewPerson: boolean
  canLinkExistingAccount: boolean
  /** Opens straight into Mode A, skipping the mode toggle — used by the `?onboard=new` handoff. */
  autoOpenNewPerson?: boolean
  onAutoOpenHandled?: () => void
}

const STEP_TITLES_NEW = ['Role details', 'User account', 'Employee details']
const STEP_TITLES_EXISTING = ['Select account', 'Employee details']

const ROLE_STEP_FIELDS: (keyof CreateRoleFormValues)[] = ['code', 'name']
const USER_STEP_FIELDS: (keyof CreateRoleFormValues)[] = ['userFirstName', 'userLastName', 'userEmail', 'userPassword', 'userPhone', 'userGender']

const CreateEmployeeModal = ({
  tenantId,
  roleTypeIds,
  canOnboardNewPerson,
  canLinkExistingAccount,
  autoOpenNewPerson,
  onAutoOpenHandled,
}: CreateEmployeeModalProps) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const bothModesAvailable = canOnboardNewPerson && canLinkExistingAccount
  const [mode, setMode] = useState<Mode>(canOnboardNewPerson ? 'new' : 'existing')
  // Resolved dynamically, never pinned to field-officer — defaults to whichever kind has an id available.
  const [workerKind, setWorkerKind] = useState<WorkerKind>(roleTypeIds['field-officer'] ? 'field-officer' : 'dietitian')
  const workerTypeId = roleTypeIds[workerKind]
  const availableWorkerKinds = (Object.keys(roleTypeIds) as WorkerKind[]).filter((k) => roleTypeIds[k])
  const [step, setStep] = useState(0)
  const [stepAttempted, setStepAttempted] = useState([false, false, false])
  const [picked, setPicked] = useState<PickedFieldOfficer | null>(null)
  // Guards a rapid double-submit before isBusy's React state re-renders onto the button; mirrors EditEmployeeEditor.tsx.
  const submittingRef = useRef(false)

  useEffect(() => {
    if (autoOpenNewPerson && canOnboardNewPerson) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode('new')
      setOpen(true)
      onAutoOpenHandled?.()
    }
  }, [autoOpenNewPerson, canOnboardNewPerson, onAutoOpenHandled])

  const { resolver: roleResolver, parsePayload: parseRolePayload } = useCreateRoleFormResolver()
  const roleForm = useForm<CreateRoleFormValues>({
    resolver: roleResolver,
    mode: 'onChange',
    defaultValues: { ...EMPTY_CREATE_FORM_VALUES, tenant: tenantId, roleType: workerTypeId },
  })

  const { resolver: employeeResolver, parsePayload: parseEmployeeFields } = useEmployeeFieldsResolver('create')
  const employeeForm = useForm<EmployeeFieldsValues>({
    resolver: employeeResolver,
    mode: 'onChange',
    defaultValues: EMPTY_EMPLOYEE_FIELDS_VALUES,
  })

  const onboard = useOnboardFieldOfficer()
  const createEmployee = useCreateEmployee()

  // Destructured so the effect depends on the stable method reference, not RHF's broader (less stable) form object.
  const { setValue: setEmployeeField } = employeeForm

  // Prefills gender from the picked Role's populated User; Location is NOT sourced this way (always filled manually).
  useEffect(() => {
    if (mode !== 'existing' || !picked) return
    setEmployeeField('profile.gender', picked.gender ?? undefined)
  }, [mode, picked, setEmployeeField])

  const stepTitles = mode === 'new' ? STEP_TITLES_NEW : STEP_TITLES_EXISTING
  const lastStepIndex = stepTitles.length - 1

  // Role/User row exists in the DB (confirmed or assumed) — editing those fields now would drift from what was persisted.
  const isAccountCommittedOrPending =
    onboard.state.step === 'account-created' ||
    onboard.state.step === 'account-creation-uncertain' ||
    onboard.state.step === 'checking-account' ||
    onboard.state.step === 'employee-uncertain' ||
    onboard.state.step === 'checking-employee'

  const isRecoveryPending =
    onboard.state.step === 'account-creation-uncertain' ||
    onboard.state.step === 'checking-account' ||
    onboard.state.step === 'employee-uncertain' ||
    onboard.state.step === 'checking-employee'

  const isBusy =
    createEmployee.isPending ||
    onboard.state.step === 'creating-account' ||
    onboard.state.step === 'creating-employee' ||
    isRecoveryPending

  // Unsafe to abandon the flow — a request may still commit after state is discarded.
  const isFlowLocked = isBusy || isAccountCommittedOrPending

  const resetAndClose = () => {
    roleForm.reset({ ...EMPTY_CREATE_FORM_VALUES, tenant: tenantId, roleType: workerTypeId })
    employeeForm.reset(EMPTY_EMPLOYEE_FIELDS_VALUES)
    setStep(0)
    setStepAttempted([false, false, false])
    setPicked(null)
    onboard.reset()
    createEmployee.reset()
    setOpen(false)
  }

  const markStepAttempted = (index: number) => setStepAttempted((prev) => prev.map((v, i) => (i === index ? true : v)))

  const handleModeChange = (nextMode: Mode) => {
    // No-op on the already-active segment, else a user with an FO picked could wipe their own selection.
    if (nextMode === mode) return
    setMode(nextMode)
    setStep(0)
    // Prevents a picked FO's gender from leaking into the other mode's flow.
    setPicked(null)
    employeeForm.reset(EMPTY_EMPLOYEE_FIELDS_VALUES)
  }

  const handleWorkerKindChange = (nextKind: WorkerKind) => {
    if (nextKind === workerKind) return
    setWorkerKind(nextKind)
    const nextTypeId = roleTypeIds[nextKind]
    // Mode A's Role form carries the worker's RoleType directly — re-point it at the new kind's id.
    roleForm.setValue('roleType', nextTypeId ?? '', { shouldValidate: true, shouldDirty: true })
    // Mode B's pick is scoped to the OLD kind's roster — meaningless once searching the other kind.
    setPicked(null)
  }

  const handleNext = async () => {
    markStepAttempted(step)
    if (mode === 'new') {
      if (step === 0) {
        if (await roleForm.trigger(ROLE_STEP_FIELDS)) setStep(1)
        return
      }
      if (step === 1) {
        if (await roleForm.trigger(USER_STEP_FIELDS)) setStep(2)
        return
      }
    } else if (step === 0 && picked) {
      setStep(1)
    }
  }

  const handleBack = () => setStep((s) => Math.max(0, s - 1))

  const buildRolePayload = async (): Promise<CreateRolePayload | null> => {
    const valid = await roleForm.trigger()
    if (!valid) return null
    return parseRolePayload(roleForm.getValues())
  }

  const submitNewPerson = async (employeeValues: EmployeeFieldsValues) => {
    // Backstop against a submit path bypassing disabled={isBusy} (e.g. a stray Enter-key submit).
    if (isBusy) return
    const employeeFields = await parseEmployeeFields(employeeValues)
    // Role+User already succeeded — retry ONLY the Employee POST, never re-touch Role/User creation.
    if (onboard.state.step === 'account-created') {
      const rolePayload = roleForm.getValues()
      await onboard.retryEmployee(rolePayload.userEmail, rolePayload.userPhone, toEmployeeFieldsPayload(employeeFields))
      return
    }
    const rolePayload = await buildRolePayload()
    if (!rolePayload) return
    await onboard.start(rolePayload, toEmployeeFieldsPayload(employeeFields))
  }

  // Guarded by submittingRef: state.step-based re-entrancy guards read state through closure, so a
  // rapid double-click can pass both invocations before the first's setState commits.
  const handleCheckIfAccountExists = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    try {
      markStepAttempted(lastStepIndex)
      if (!(await employeeForm.trigger())) return
      const employeeFields = await parseEmployeeFields(employeeForm.getValues())
      await onboard.checkIfAccountExists(toEmployeeFieldsPayload(employeeFields))
    } finally {
      submittingRef.current = false
    }
  }

  // Same guard, for the employee-uncertain recovery path.
  const handleCheckIfEmployeeExists = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    try {
      await onboard.checkIfEmployeeExists()
    } finally {
      submittingRef.current = false
    }
  }

  const submitExisting = async (employeeValues: EmployeeFieldsValues) => {
    if (!picked) return
    const employeeFields = await parseEmployeeFields(employeeValues)
    // mutateAsync (not mutate) so the caller can await settlement; the ref guard must stay held until resolved/rejected.
    try {
      const res = await createEmployee.mutateAsync({
        ...toEmployeeFieldsPayload(employeeFields),
        user: picked.userId,
        email: picked.email,
        phone: picked.phone,
        tenant: tenantId,
      })
      resetAndClose()
      if (res.data?.id) navigate(EMPLOYEE_ROUTES.EMPLOYEE_DETAIL.replace(':id', res.data.id))
    } catch {
      // createEmployee.isError (rendered below) surfaces the failure to the user.
    }
  }

  /* eslint-disable react-hooks/refs -- submittingRef.current is never read during render. */
  const guardedFinalSubmit = employeeForm.handleSubmit(
    (values) => {
      // Synchronous guard: a rapid double-submit must not re-enter while the first is still in flight.
      if (submittingRef.current) return
      submittingRef.current = true
      markStepAttempted(lastStepIndex)
      const run = mode === 'new' ? submitNewPerson(values) : submitExisting(values)
      // Swallowed here, not left as unhandled rejections — onboard.state/createEmployee's mutation state surfaces it.
      run.catch(() => {}).finally(() => {
        submittingRef.current = false
      })
    },
    // RHF only calls the success callback when validation passes — invalid submits need this to flip showErrors on.
    () => markStepAttempted(lastStepIndex),
  )
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    if (onboard.state.step === 'done') {
      const { employeeId } = onboard.state
      // eslint-disable-next-line react-hooks/set-state-in-effect
      resetAndClose()
      navigate(EMPLOYEE_ROUTES.EMPLOYEE_DETAIL.replace(':id', employeeId))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboard.state])

  if (!canOnboardNewPerson && !canLinkExistingAccount) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setOpen(true)
        else if (!isFlowLocked) resetAndClose()
      }}
    >
      <Button
        onClick={() => setOpen(true)}
        className="text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
      >
        <FiPlus size={14} /> New Employee
      </Button>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New employee</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {stepTitles.length} — {stepTitles[step]}.
          </DialogDescription>
        </DialogHeader>

        {step === 0 && availableWorkerKinds.length > 1 && (
          <SegRow>
            {availableWorkerKinds.map((kind) => (
              <SegButton key={kind} active={workerKind === kind} onClick={() => handleWorkerKindChange(kind)}>
                {WORKER_KIND_LABEL[kind]}
              </SegButton>
            ))}
          </SegRow>
        )}

        {bothModesAvailable && step === 0 && (
          <SegRow>
            <SegButton active={mode === 'new'} onClick={() => handleModeChange('new')}>
              Onboard a new person
            </SegButton>
            <SegButton active={mode === 'existing'} onClick={() => handleModeChange('existing')}>
              Link an existing account
            </SegButton>
          </SegRow>
        )}

        <form onSubmit={guardedFinalSubmit} noValidate>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 mt-4">
            {mode === 'new' && step === 0 && (
              <div className="rounded-xl border p-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
                <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Role details</h2>
                <div className="space-y-4">
                  <div>
                    <FieldLabel htmlFor="code">Code</FieldLabel>
                    <Input id="code" type="text" placeholder="e.g. fo-ravi-kumar" {...roleForm.register('code')} />
                    {stepAttempted[0] && roleForm.formState.errors.code && (
                      <p className="text-xs text-danger mt-1.5">{roleForm.formState.errors.code.message}</p>
                    )}
                  </div>
                  <div>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input id="name" type="text" {...roleForm.register('name')} />
                    {stepAttempted[0] && roleForm.formState.errors.name && (
                      <p className="text-xs text-danger mt-1.5">{roleForm.formState.errors.name.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {mode === 'new' && step === 1 && (
              <RoleUserSection
                mode="create"
                register={roleForm.register}
                control={roleForm.control}
                errors={roleForm.formState.errors}
                touchedFields={stepAttempted[1] ? Object.fromEntries(USER_STEP_FIELDS.map((n) => [n, true])) : roleForm.formState.touchedFields}
              />
            )}

            {mode === 'new' && step === 2 && (
              <EmployeeFieldsSection
                mode="create"
                register={employeeForm.register}
                control={employeeForm.control}
                errors={employeeForm.formState.errors}
                showErrors={stepAttempted[2]}
              />
            )}

            {mode === 'existing' && step === 0 && (
              <ExistingFieldOfficerPicker
                tenant={tenantId}
                roleTypeId={workerTypeId}
                workerLabel={workerKind === 'dietitian' ? 'dietitian' : 'field officer'}
                value={picked?.userId ?? null}
                onChange={setPicked}
              />
            )}

            {mode === 'existing' && step === 1 && (
              <EmployeeFieldsSection
                mode="create"
                register={employeeForm.register}
                control={employeeForm.control}
                errors={employeeForm.formState.errors}
                showErrors={stepAttempted[1]}
              />
            )}

            {onboard.state.step === 'account-creation-failed' && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                {(() => {
                  const err = onboard.state.error
                  // AxiosError IS an Error instance, so it must be excluded from the internalMessage check below.
                  const backendMessage = getApiErrorMessage(err, '')
                  const internalMessage = !axios.isAxiosError(err) && err instanceof Error ? err.message : ''
                  return backendMessage || internalMessage
                    || "Couldn't create the account for this person. Nothing was saved — check the details and try again."
                })()}
              </div>
            )}
            {(onboard.state.step === 'account-creation-uncertain' || onboard.state.step === 'checking-account') && (
              <div className="text-xs rounded-xl px-3 py-2 bg-warning-soft border border-warning text-warning space-y-2">
                <p>We couldn't confirm whether the account was created. Check before retrying — clicking "Create employee" again could fail with a duplicate error if it already exists.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCheckIfAccountExists().catch(() => {})}
                  disabled={onboard.state.step === 'checking-account'}
                >
                  {onboard.state.step === 'checking-account' ? 'Checking…' : 'Check again'}
                </Button>
              </div>
            )}
            {onboard.state.step === 'account-created' && (
              <div className="text-xs rounded-xl px-3 py-2 bg-success-soft border border-success text-success">
                Account created for {onboard.state.userLabel}. Retrying employee creation only.
              </div>
            )}
            {(onboard.state.step === 'employee-uncertain' || onboard.state.step === 'checking-employee') && (
              <div className="text-xs rounded-xl px-3 py-2 bg-warning-soft border border-warning text-warning space-y-2">
                <p>The account was created, but we couldn't confirm the employee record. Check before retrying.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCheckIfEmployeeExists().catch(() => {})}
                  disabled={onboard.state.step === 'checking-employee'}
                >
                  {onboard.state.step === 'checking-employee' ? 'Checking…' : 'Check again'}
                </Button>
              </div>
            )}
            {(onboard.state.step === 'creating-account' || onboard.state.step === 'creating-employee') && (
              <div className="text-xs rounded-xl px-3 py-2 bg-warning-soft border border-warning text-warning">
                Complete or resolve this employee creation before closing.
              </div>
            )}
            {createEmployee.isError && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                Failed to create the employee record. Please try again.
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={handleBack} disabled={isFlowLocked}>
                <FiArrowLeft size={14} /> Back
              </Button>
            )}
            {step === 0 && (
              <Button type="button" variant="outline" onClick={resetAndClose} disabled={isFlowLocked}>
                Cancel
              </Button>
            )}
            {step < lastStepIndex && (
              <Button type="button" onClick={() => void handleNext()} disabled={isFlowLocked || (mode === 'existing' && step === 0 && !picked)}>
                Next
              </Button>
            )}
            {step === lastStepIndex && (
              <Button type="submit" disabled={isBusy}>
                {isBusy ? 'Creating…' : 'Create employee'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateEmployeeModal
