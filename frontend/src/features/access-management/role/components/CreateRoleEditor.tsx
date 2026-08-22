import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useCreateRole } from '@/features/access-management/role/hooks/useCreateRole'
import { useRolePermissionPicker } from '@/features/access-management/role/hooks/useRolePermissionPicker'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useDivisions } from '@/features/crm/divisions/hooks/useDivisions'
import { ROLE_ROUTES } from '@/features/access-management/role/role.routes'
import { PHARMA_SUPERVISOR_PARENT_CODE } from '@/features/access-management/role/constants/pharmaSupervisorTree'
import RoleDetailsSection from '@/features/access-management/role/components/RoleDetailsSection'
import RoleUserSection from '@/features/access-management/role/components/RoleUserSection'
import RolePermissionsSection from '@/features/access-management/role/components/RolePermissionsSection'
import { Button } from '@/components/ui/button'
import FieldLabel from '@/components/ui/FieldLabel'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'
import TenantPicker from '@/components/ui/TenantPicker'
import { useCreateRoleFormResolver, toCreateRolePayload, EMPTY_CREATE_FORM_VALUES, type CreateRoleFormValues } from '@/features/access-management/role/roleForm'

const RESTRICTED_ROLETYPE_CODES = ['admin', 'pharma-division-head']

const CreateRoleEditor = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { resolver, parsePayload } = useCreateRoleFormResolver()

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, touchedFields },
  } = useForm<CreateRoleFormValues>({
    resolver,
    mode: 'onChange',
    defaultValues: {
      ...EMPTY_CREATE_FORM_VALUES,
      tenant: searchParams.get('tenant') ?? '',
      roleType: searchParams.get('roleType') ?? '',
    },
  })

  const tenant = useWatch({ control, name: 'tenant' })
  const roleType = useWatch({ control, name: 'roleType' })
  const division = useWatch({ control, name: 'division' })
  const supervisor = useWatch({ control, name: 'supervisor' })

  const { data: tenantsData } = useTenants({ limit: '20' })
  const tenants = tenantsData?.data?.items ?? []

  const { data: roleTypesData } = useRoleTypes({ tenant: tenant || undefined }, !!tenant)
  const roleTypes = roleTypesData?.data?.items ?? []
  const roleTypeOptions = roleTypes.filter((rt) => !RESTRICTED_ROLETYPE_CODES.includes(rt.code))

  const createRole = useCreateRole()

  const picker = useRolePermissionPicker(tenant || undefined, roleType, roleTypes)

  const selectedRoleTypeCode = roleTypes.find((rt) => rt.id === roleType)?.code
  const supervisorParentCode = selectedRoleTypeCode ? PHARMA_SUPERVISOR_PARENT_CODE[selectedRoleTypeCode] : undefined
  const needsDivision = selectedRoleTypeCode !== undefined && selectedRoleTypeCode in PHARMA_SUPERVISOR_PARENT_CODE
  const needsSupervisor = !!supervisorParentCode

  const { data: divisionsData } = useDivisions({ tenant: tenant || undefined }, needsDivision && !!tenant)
  const divisions = divisionsData?.data?.items ?? []

  const parentTypeId = roleTypes.find((rt) => rt.code === supervisorParentCode)?.id

  const { data: supervisorCandidatesData, isLoading: isLoadingSupervisors } = useRoles(
    { tenant: tenant || undefined, division: division || undefined, type: parentTypeId, status: 'active' },
    needsSupervisor && !!tenant && !!division && !!parentTypeId,
  )
  const supervisorCandidates = supervisorCandidatesData?.data?.items ?? []

  useEffect(() => {
    setValue('division', '')
    setValue('supervisor', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleType, tenant])

  const onSubmit = async (values: CreateRoleFormValues) => {
    const parsed = await parsePayload(values)
    createRole.mutate(toCreateRolePayload(parsed, [...picker.effectiveSelectedCodes]), {
      onSuccess: (res) => {
        if (res.data?.id) navigate(ROLE_ROUTES.ROLE_DETAIL.replace(':id', res.data.id))
      },
    })
  }

  const guardedSubmit = handleSubmit((values) => {
    if (needsDivision && !values.division) return
    if (needsSupervisor && !values.supervisor) return
    onSubmit(values)
  })

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(ROLE_ROUTES.ROLES)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to roles
      </button>

      <form onSubmit={guardedSubmit} noValidate>
        <div className="rounded-xl border p-5 mb-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="text-lg font-bold mb-3" style={{ color: 'var(--qms-text)' }}>
            New role
          </div>
          <div>
            <FieldLabel htmlFor="tenant">Company</FieldLabel>
            <Controller
              control={control}
              name="tenant"
              render={({ field }) => (
                <TenantPicker
                  id="tenant"
                  tenants={tenants}
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    setValue('roleType', '')
                  }}
                />
              )}
            />
            {touchedFields.tenant && errors.tenant && <p className="text-xs text-danger mt-1.5">{errors.tenant.message}</p>}
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
              The role type and elevated permissions below are scoped to this company.
            </p>
          </div>
        </div>

        <RoleDetailsSection
          mode="create"
          register={register}
          control={control}
          errors={errors}
          touchedFields={touchedFields}
          roleTypeOptions={roleTypeOptions}
          tenant={tenant}
          needsDivision={needsDivision}
          needsSupervisor={needsSupervisor}
          divisions={divisions}
          division={division}
          supervisorCandidates={supervisorCandidates}
          isLoadingSupervisors={isLoadingSupervisors}
          onDivisionChange={() => setValue('supervisor', '')}
        />

        <RoleUserSection
          mode="create"
          register={register}
          control={control}
          errors={errors}
          touchedFields={touchedFields}
        />

        <RolePermissionsSection
          tenant={tenant}
          roleType={roleType}
          picker={picker}
          validationBanners={
            <>
              {needsDivision && !division && (
                <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
                  Select a division for this role type.
                </div>
              )}
              {needsSupervisor && division && !supervisor && (
                <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
                  {supervisorCandidates.length === 0 && !isLoadingSupervisors
                    ? 'No eligible supervisor exists in this division yet — create one first.'
                    : 'Select a supervisor for this role type.'}
                </div>
              )}
            </>
          }
        >
          <MutationStatusBanner mutation={createRole} showSuccess={false} />
          <Button type="submit" disabled={createRole.isPending} className="mt-4">
            {createRole.isPending ? 'Saving…' : 'Create role'}
          </Button>
        </RolePermissionsSection>
      </form>
    </div>
  )
}

export default CreateRoleEditor
