import { useEffect, useRef, useState } from 'react'
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

type Mode = 'new' | 'existing'

interface CreateEmployeeModalProps {
  tenantId: string
  foTypeId: string
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
  foTypeId,
  canOnboardNewPerson,
  canLinkExistingAccount,
  autoOpenNewPerson,
  onAutoOpenHandled,
}: CreateEmployeeModalProps) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const bothModesAvailable = canOnboardNewPerson && canLinkExistingAccount
  const [mode, setMode] = useState<Mode>(canOnboardNewPerson ? 'new' : 'existing')
  const [step, setStep] = useState(0)
  const [stepAttempted, setStepAttempted] = useState([false, false, false])
  const [picked, setPicked] = useState<PickedFieldOfficer | null>(null)
  // Synchronous guard against a rapid double-submit firing two creates before isBusy's React state
  // re-renders onto the button — mirrors EditEmployeeEditor.tsx's submittingRef pattern. isBusy is
  // still kept as the render-time disabled/label source, but this ref is the actual gate.
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
    defaultValues: { ...EMPTY_CREATE_FORM_VALUES, tenant: tenantId, roleType: foTypeId },
  })

  const { resolver: employeeResolver, parsePayload: parseEmployeeFields } = useEmployeeFieldsResolver()
  const employeeForm = useForm<EmployeeFieldsValues>({
    resolver: employeeResolver,
    mode: 'onChange',
    defaultValues: EMPTY_EMPLOYEE_FIELDS_VALUES,
  })

  const onboard = useOnboardFieldOfficer()
  const createEmployee = useCreateEmployee()

  // Destructured so the effect below can depend on the stable method reference itself, not the
  // whole employeeForm object — depending on employeeForm directly would pull in RHF's broader
  // (and less stable) form/control object as a dep, risking extra reruns.
  const { setValue: setEmployeeField } = employeeForm

  // Prefills gender from the picked Role's populated User (already in hand, no fetch needed) —
  // resets to undefined for a switched-to FO with no gender on file, never leaves a previous pick's
  // value in place. Location is NOT sourced this way: it's the person's own residential address
  // (see EmployeeFieldsSection's Location card), unrelated to GeoProfile's operating-base data, and
  // is always filled in manually.
  useEffect(() => {
    if (mode !== 'existing' || !picked) return
    setEmployeeField('profile.gender', picked.gender ?? undefined)
  }, [mode, picked, setEmployeeField])

  const stepTitles = mode === 'new' ? STEP_TITLES_NEW : STEP_TITLES_EXISTING
  const lastStepIndex = stepTitles.length - 1

  // The Role/User row exists in the DB (confirmed or reasonably assumed) — editing the Role/User
  // step's fields now would drift from what was persisted, or (uncertain states) risk a duplicate.
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

  // Unsafe to abandon the flow (Back/Next, or closing the dialog) — isAccountCommittedOrPending
  // plus the in-flight creates, where a request may still commit after state is discarded.
  const isFlowLocked = isBusy || isAccountCommittedOrPending

  const resetAndClose = () => {
    roleForm.reset({ ...EMPTY_CREATE_FORM_VALUES, tenant: tenantId, roleType: foTypeId })
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
    // Clicking the already-active segment must be a no-op — without this, a user who already
    // picked an FO could click the still-highlighted "Link an existing account" segment and
    // unexpectedly wipe their own selection for no reason.
    if (nextMode === mode) return
    setMode(nextMode)
    setStep(0)
    // Prevents a picked FO's gender from leaking into the other mode's flow if the user switches
    // without closing the dialog.
    setPicked(null)
    employeeForm.reset(EMPTY_EMPLOYEE_FIELDS_VALUES)
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
    // Backstop against any submit path that bypasses the button's own disabled={isBusy} (e.g. a
    // stray Enter-key submit) — every busy/uncertain state must be a pure no-op here; "Check
    // again" in the banner is the only intentional way to trigger a recovery lookup.
    if (isBusy) return
    const employeeFields = await parseEmployeeFields(employeeValues)
    // Role+User already succeeded (a prior Employee-creation attempt failed) — retry ONLY the
    // Employee POST, never re-touch Role/User creation (useOnboardFieldOfficer's whole point).
    if (onboard.state.step === 'account-created') {
      const rolePayload = roleForm.getValues()
      await onboard.retryEmployee(rolePayload.userEmail, rolePayload.userPhone, toEmployeeFieldsPayload(employeeFields))
      return
    }
    const rolePayload = await buildRolePayload()
    if (!rolePayload) return
    await onboard.start(rolePayload, toEmployeeFieldsPayload(employeeFields))
  }

  // The Employee-fields step stays editable while uncertain, so recovery uses what's on screen
  // NOW. trigger() first so an invalid edit surfaces as a field error, not an unhandled rejection.
  // Guarded by the same submittingRef as the main submit — state.step-based re-entrancy guards
  // inside useOnboardFieldOfficer read state through closure, so a rapid double-click can pass
  // both invocations before the first's setState commits; the synchronous ref closes that gap.
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

  // Same guard, for the employee-uncertain recovery path — previously called inline with no
  // wrapper at all, so it had no re-entrancy protection whatsoever.
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
    // mutateAsync (not mutate) so the caller can await settlement — guardedFinalSubmit's ref guard
    // must stay held until this either resolves or rejects, not just until it's dispatched.
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
      // createEmployee.isError (rendered below) is what surfaces the failure to the user.
    }
  }

  /* eslint-disable react-hooks/refs -- handleSubmit(...) only invokes this callback later, on an
     actual submit event; submittingRef.current is never read during render. */
  const guardedFinalSubmit = employeeForm.handleSubmit((values) => {
    // Synchronous guard: a rapid double-submit must not re-enter while the first is still in
    // flight, including Mode A's account-created -> retryEmployee path — retryEmployee now returns
    // its underlying promise specifically so this await captures the true end of the attempt.
    if (submittingRef.current) return
    submittingRef.current = true
    markStepAttempted(lastStepIndex)
    const run = mode === 'new' ? submitNewPerson(values) : submitExisting(values)
    // Errors are swallowed here, not left to become unhandled rejections — onboard.state /
    // createEmployee's own mutation state (rendered below) is what surfaces the failure to the user.
    run.catch(() => {}).finally(() => {
      submittingRef.current = false
    })
  })
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
                foTypeId={foTypeId}
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
                {onboard.state.error instanceof Error && onboard.state.error.message.includes('different account')
                  ? onboard.state.error.message
                  : "Couldn't create the account for this person. Nothing was saved — check the details and try again."}
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
