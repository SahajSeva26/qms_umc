import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { FiArrowLeft, FiPlus } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import FieldLabel from '@/components/ui/FieldLabel'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'
import TenantSearchList from '@/components/ui/TenantSearchList'
import { useCreateRole } from '@/features/access-management/role/hooks/useCreateRole'
import { useRolePermissionPicker } from '@/features/access-management/role/hooks/useRolePermissionPicker'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useDivisions } from '@/features/crm/divisions/hooks/useDivisions'
import { ROLE_ROUTES } from '@/features/access-management/role/role.routes'
import { PHARMA_SUPERVISOR_PARENT_CODE } from '@/features/access-management/role/constants/pharmaSupervisorTree'
import RoleDetailsSection from '@/features/access-management/role/components/RoleDetailsSection'
import RoleUserSection from '@/features/access-management/role/components/RoleUserSection'
import RolePermissionsSection from '@/features/access-management/role/components/RolePermissionsSection'
import { useCreateRoleFormResolver, toCreateRolePayload, EMPTY_CREATE_FORM_VALUES, type CreateRoleFormValues } from '@/features/access-management/role/roleForm'

const RESTRICTED_ROLETYPE_CODES = ['admin', 'pharma-division-head']

const STEP_TITLES = ['Company & role', 'User account', 'Permissions']

// Fields grouped by step, used to force "touched" only for a step's own
// fields once its Next/Submit has been attempted.
const STEP_FIELD_NAMES: (keyof CreateRoleFormValues)[][] = [
  ['code', 'name', 'roleType', 'division', 'supervisor'],
  ['userFirstName', 'userLastName', 'userEmail', 'userPassword', 'userPhone', 'userGender'],
  [],
]

const touchedOverrideFor = (
  stepIndex: number,
  attempted: boolean,
  realTouched: Partial<Record<keyof CreateRoleFormValues, boolean>>,
): Partial<Record<keyof CreateRoleFormValues, boolean>> =>
  attempted
    ? { ...realTouched, ...Object.fromEntries(STEP_FIELD_NAMES[stepIndex].map((name) => [name, true])) }
    : realTouched

const CreateRoleModal = () => {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  // trigger() doesn't mark fields "touched", so without this a blind Next
  // click on a blank step wouldn't show errors for untouched fields.
  const [stepAttempted, setStepAttempted] = useState([false, false, false])
  const navigate = useNavigate()
  const { resolver, parsePayload } = useCreateRoleFormResolver()

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    control,
    reset,
    formState: { errors, touchedFields },
  } = useForm<CreateRoleFormValues>({
    resolver,
    mode: 'onChange',
    defaultValues: EMPTY_CREATE_FORM_VALUES,
  })

  const tenant = useWatch({ control, name: 'tenant' })
  const roleType = useWatch({ control, name: 'roleType' })
  const division = useWatch({ control, name: 'division' })
  const supervisor = useWatch({ control, name: 'supervisor' })

  const { data: roleTypesData } = useRoleTypes({ tenant: tenant || undefined }, open && !!tenant)
  const roleTypes = roleTypesData?.data?.items ?? []
  const roleTypeOptions = roleTypes.filter((rt) => !RESTRICTED_ROLETYPE_CODES.includes(rt.code))

  const createRole = useCreateRole()

  const picker = useRolePermissionPicker(tenant || undefined, roleType, roleTypes)

  const selectedRoleTypeCode = roleTypes.find((rt) => rt.id === roleType)?.code
  const supervisorParentCode = selectedRoleTypeCode ? PHARMA_SUPERVISOR_PARENT_CODE[selectedRoleTypeCode] : undefined
  const needsDivision = selectedRoleTypeCode !== undefined && selectedRoleTypeCode in PHARMA_SUPERVISOR_PARENT_CODE
  const needsSupervisor = !!supervisorParentCode

  const { data: divisionsData } = useDivisions({ tenant: tenant || undefined }, open && needsDivision && !!tenant)
  const divisions = divisionsData?.data?.items ?? []

  const parentTypeId = roleTypes.find((rt) => rt.code === supervisorParentCode)?.id

  const { data: supervisorCandidatesData, isLoading: isLoadingSupervisors } = useRoles(
    { tenant: tenant || undefined, division: division || undefined, type: parentTypeId, status: 'active' },
    open && needsSupervisor && !!tenant && !!division && !!parentTypeId,
  )
  const supervisorCandidates = supervisorCandidatesData?.data?.items ?? []

  // A division/supervisor picked under one company or role type is invalid
  // under a different one (backend scopes both to the specific company + pharma-tree role type).
  const handleTenantChange = () => {
    setValue('roleType', '')
    setValue('division', '')
    setValue('supervisor', '')
  }

  const handleRoleTypeChange = () => {
    setValue('division', '')
    setValue('supervisor', '')
  }

  const resetAndClose = () => {
    reset(EMPTY_CREATE_FORM_VALUES)
    setStep(0)
    setStepAttempted([false, false, false])
    createRole.reset()
    setOpen(false)
  }

  const markStepAttempted = (index: number) => {
    setStepAttempted((prev) => prev.map((v, i) => (i === index ? true : v)))
  }

  const handleNext = async () => {
    markStepAttempted(step)
    if (step === 0) {
      const valid = await trigger(['tenant', 'code', 'name', 'roleType'])
      if (!valid) return
      if (needsDivision && !division) return
      if (needsSupervisor && !supervisor) return
      setStep(1)
      return
    }
    if (step === 1) {
      const valid = await trigger(['userFirstName', 'userEmail', 'userPassword', 'userPhone'])
      if (valid) setStep(2)
    }
  }

  const handleBack = () => setStep((s) => Math.max(0, s - 1))

  const onSubmit = async (values: CreateRoleFormValues) => {
    const parsed = await parsePayload(values)
    createRole.mutate(toCreateRolePayload(parsed, [...picker.effectiveSelectedCodes]), {
      onSuccess: (res) => {
        resetAndClose()
        if (res.data?.id) navigate(ROLE_ROUTES.ROLE_DETAIL.replace(':id', res.data.id))
      },
    })
  }

  const guardedSubmit = handleSubmit((values) => {
    markStepAttempted(2)
    if (needsDivision && !values.division) return
    if (needsSupervisor && !values.supervisor) return
    onSubmit(values)
  })

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : resetAndClose())}>
      <Button
        onClick={() => setOpen(true)}
        className="text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
      >
        <FiPlus size={14} /> New Role
      </Button>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
          <DialogDescription>
            Step {step + 1} of 3 — {STEP_TITLES[step]}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={guardedSubmit} noValidate>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {step === 0 && (
              <>
                <div>
                  <FieldLabel htmlFor="tenant">Company</FieldLabel>
                  <Controller
                    control={control}
                    name="tenant"
                    render={({ field }) => (
                      <TenantSearchList
                        id="tenant"
                        value={field.value}
                        onChange={(id) => {
                          field.onChange(id)
                          handleTenantChange()
                        }}
                      />
                    )}
                  />
                  {(touchedFields.tenant || stepAttempted[0]) && errors.tenant && (
                    <p className="text-xs text-danger mt-1.5">{errors.tenant.message}</p>
                  )}
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                    The role type and elevated permissions below are scoped to this company.
                  </p>
                </div>

                <RoleDetailsSection
                  mode="create"
                  register={register}
                  control={control}
                  errors={errors}
                  touchedFields={touchedOverrideFor(0, stepAttempted[0], touchedFields)}
                  roleTypeOptions={roleTypeOptions}
                  tenant={tenant}
                  needsDivision={needsDivision}
                  needsSupervisor={needsSupervisor}
                  divisions={divisions}
                  division={division}
                  supervisorCandidates={supervisorCandidates}
                  isLoadingSupervisors={isLoadingSupervisors}
                  onRoleTypeChange={handleRoleTypeChange}
                  onDivisionChange={() => setValue('supervisor', '')}
                />

                {needsDivision && !division && stepAttempted[0] && (
                  <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                    Select a division for this role type.
                  </div>
                )}
                {needsSupervisor && division && !supervisor && stepAttempted[0] && (
                  <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                    {supervisorCandidates.length === 0 && !isLoadingSupervisors
                      ? 'No eligible supervisor exists in this division yet — create one first.'
                      : 'Select a supervisor for this role type.'}
                  </div>
                )}
              </>
            )}

            {step === 1 && (
              <RoleUserSection
                mode="create"
                register={register}
                control={control}
                errors={errors}
                touchedFields={touchedOverrideFor(1, stepAttempted[1], touchedFields)}
              />
            )}

            {step === 2 && (
              <RolePermissionsSection tenant={tenant} roleType={roleType} picker={picker}>
                <MutationStatusBanner mutation={createRole} showSuccess={false} />
              </RolePermissionsSection>
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
                <Button type="button" variant="outline" onClick={handleBack}>
                  <FiArrowLeft size={14} /> Back
                </Button>
                <Button type="button" onClick={handleNext}>Next</Button>
              </>
            )}
            {step === 2 && (
              <>
                <Button type="button" variant="outline" onClick={handleBack} disabled={createRole.isPending}>
                  <FiArrowLeft size={14} /> Back
                </Button>
                <Button type="submit" disabled={createRole.isPending}>
                  {createRole.isPending ? 'Creating…' : 'Create role'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateRoleModal
