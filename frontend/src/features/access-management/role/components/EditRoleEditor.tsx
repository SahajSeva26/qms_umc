import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useForm, useWatch } from 'react-hook-form'
import { useUpdateRole } from '@/features/access-management/role/hooks/useUpdateRole'
import { useRolePermissionPicker } from '@/features/access-management/role/hooks/useRolePermissionPicker'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { ROLE_ROUTES } from '@/features/access-management/role/role.routes'
import RoleStatusPill from '@/features/access-management/role/components/RoleStatusPill'
import RoleDetailsSection from '@/features/access-management/role/components/RoleDetailsSection'
import RoleUserSection from '@/features/access-management/role/components/RoleUserSection'
import RolePermissionsSection from '@/features/access-management/role/components/RolePermissionsSection'
import { Button } from '@/components/ui/button'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'
import { useEditRoleFormResolver, toUpdateRolePayload, type UpdateRoleFormValues } from '@/features/access-management/role/roleForm'
import { unwrapId } from '@/utils/unwrapId'
import type { RoleEntity, RolePopulatedRoleType, RolePopulatedTenant, RolePopulatedUser } from '@/types/accessManagement.types'

interface EditRoleEditorProps {
  role: RoleEntity
}

const EditRoleEditor = ({ role }: EditRoleEditorProps) => {
  const navigate = useNavigate()
  const { resolver, parsePayload } = useEditRoleFormResolver()
  const userValue = role.user as RolePopulatedUser | string

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, touchedFields },
  } = useForm<UpdateRoleFormValues>({
    resolver,
    mode: 'onChange',
    defaultValues: {
      name: role.name,
      description: role.description ?? '',
      status: role.status ?? '',
      roleType: unwrapId(role.type),
      userFirstName: typeof userValue !== 'string' ? (userValue.firstName ?? '') : '',
      userLastName: typeof userValue !== 'string' ? (userValue.lastName ?? '') : '',
      userPhone: typeof userValue !== 'string' ? (userValue.phone ?? '') : '',
      userGender: typeof userValue !== 'string' ? ((userValue.gender as UpdateRoleFormValues['userGender']) ?? '') : '',
      userStatus: typeof userValue !== 'string' ? ((userValue.status as UpdateRoleFormValues['userStatus']) ?? '') : '',
    },
  })

  const roleType = useWatch({ control, name: 'roleType' })
  const tenantId = unwrapId(role.tenant)

  const { data: roleTypesData } = useRoleTypes({ tenant: tenantId || undefined }, !!tenantId)
  const roleTypes = roleTypesData?.data?.items ?? []

  const picker = useRolePermissionPicker(tenantId || undefined, roleType, roleTypes, role.permissions ?? [])

  const updateRole = useUpdateRole(role.id)

  const onSubmit = async (values: UpdateRoleFormValues) => {
    const parsed = await parsePayload(values)
    updateRole.mutate(toUpdateRolePayload(parsed, [...picker.effectiveSelectedCodes]))
  }

  const roleTypeName = (role.type as RolePopulatedRoleType)?.name
  const tenantName = (role.tenant as RolePopulatedTenant)?.name
  const userEmail = typeof userValue !== 'string' ? userValue.email : undefined

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

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="rounded-xl border p-5 mb-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
                {role.name}
              </div>
              <div className="text-[13px] truncate font-mono" style={{ color: 'var(--qms-text-muted)' }}>
                {role.code}
              </div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                {tenantName && <>Company: {tenantName}. </>}
                {roleTypeName && <>Role type: {roleTypeName}</>}
              </div>
            </div>
            <RoleStatusPill status={role.status} />
          </div>
        </div>

        <RoleDetailsSection
          mode="edit"
          register={register}
          control={control}
          errors={errors}
          touchedFields={touchedFields}
          roleTypeOptions={roleTypes}
          roleTypeName={roleTypeName}
          tenant={tenantId}
          needsDivision={false}
          needsSupervisor={false}
          divisions={[]}
          division=""
          supervisorCandidates={[]}
          isLoadingSupervisors={false}
        />

        <RoleUserSection
          mode="edit"
          register={register}
          control={control}
          errors={errors}
          touchedFields={touchedFields}
          userEmail={userEmail}
        />

        <RolePermissionsSection tenant={tenantId} roleType={roleType} picker={picker}>
          <MutationStatusBanner mutation={updateRole} showSuccess />
          <Button type="submit" disabled={updateRole.isPending} className="mt-4">
            {updateRole.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </RolePermissionsSection>
      </form>
    </div>
  )
}

export default EditRoleEditor
