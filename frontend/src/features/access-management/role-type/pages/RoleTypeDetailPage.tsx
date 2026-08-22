import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { FiArrowLeft } from 'react-icons/fi'
import { usePermissionCodeSelection } from '@/features/access-management/hooks/usePermissionCodeSelection'
import { useRoleType } from '@/features/access-management/role-type/hooks/useRoleType'
import { useUpdateRoleType } from '@/features/access-management/role-type/hooks/useUpdateRoleType'
import { useCreateRoleType } from '@/features/access-management/role-type/hooks/useCreateRoleType'
import { useTenantPermissionGroup } from '@/features/access-management/role-type/hooks/useTenantPermissionGroup'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { ROLE_TYPE_ROUTES } from '@/features/access-management/role-type/role-type.routes'
import { ROLE_TYPE_CODE_GROUPS, isReservedTenantAdminCode } from '@/features/access-management/role-type/constants/roleTypeCodes'
import RoleTypeStatusPill from '@/features/access-management/role-type/components/RoleTypeStatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FieldLabel from '@/components/ui/FieldLabel'
import MutationStatusBanner from '@/components/ui/MutationStatusBanner'
import TenantPicker from '@/components/ui/TenantPicker'
import PermissionCheckboxRow from '@/components/ui/PermissionCheckboxRow'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionItem, AccordionTrigger, AccordionPanel } from '@/components/ui/accordion'
import { PERMISSION_CATALOG, PERMISSION_RESOURCE_LABELS } from '@/features/access-management/permission-group/constants/permissionCatalog'
import { createRoleTypeSchema, updateRoleTypeSchema } from '@/features/access-management/role-type/schemas/roleType.schemas'
import { unwrapId } from '@/utils/unwrapId'
import { useReshapingResolver } from '@/features/access-management/hooks/useReshapingResolver'
import type { RoleTypeCode, RoleTypeStatus } from '@/features/access-management/accessManagement.types'

// Maps every catalog permission code back to its resource key for grouping.
const CODE_TO_RESOURCE_KEY: Record<string, keyof typeof PERMISSION_CATALOG> = Object.fromEntries(
  (Object.entries(PERMISSION_CATALOG) as [keyof typeof PERMISSION_CATALOG, Record<string, { code: string }>][]).flatMap(
    ([resourceKey, actions]) => Object.values(actions).map((permission) => [permission.code, resourceKey]),
  ),
)

interface RoleTypeFormValues {
  code: RoleTypeCode | ''
  name: string
  description: string
  tenant: string
  status: RoleTypeStatus | ''
}

// '' (this form's "unset" sentinel) is normalized to undefined so whichever
// schema applies to the current mode validates it correctly.
const useRoleTypeFormResolver = (schema: typeof createRoleTypeSchema | typeof updateRoleTypeSchema) =>
  useReshapingResolver<RoleTypeFormValues>({
    schema,
    toPayload: (values) => ({
      // name/tenant stay raw '' so Zod's .min(1) message fires instead of a type mismatch.
      code: values.code || undefined,
      name: values.name,
      description: values.description || undefined,
      tenant: values.tenant,
      status: values.status || undefined,
    }),
  })

// Combined create-flow + edit page (no `:id` -> create, `:id` -> edit).
// Pickable permissions are ceiling-scoped to the target tenant's own PermissionGroup.
const RoleTypeDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const isCreateMode = !id
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { data, isLoading, error } = useRoleType(id)
  const roleType = data?.data ?? null

  const { data: tenantsData } = useTenants({})
  const tenants = tenantsData?.data?.items ?? []

  const resolver = useRoleTypeFormResolver(isCreateMode ? createRoleTypeSchema : updateRoleTypeSchema)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<RoleTypeFormValues>({
    resolver,
    mode: 'onChange',
    defaultValues: {
      code: '',
      name: '',
      description: '',
      tenant: searchParams.get('tenant') ?? '',
      status: '',
    },
  })

  const tenant = watch('tenant')

  useEffect(() => {
    if (roleType && !isCreateMode) {
      // roleType.tenant may be a raw id or a populated object depending on the endpoint.
      setValue('tenant', unwrapId(roleType.tenant))
    }
  }, [roleType, isCreateMode, setValue])

  const selectedTenantRecord = tenants.find((t) => t.id === tenant)

  const { permissionGroup, isLoading: isLoadingCeiling } = useTenantPermissionGroup(tenant || undefined)
  const ceilingPermissions = useMemo(() => permissionGroup?.permissions ?? [], [permissionGroup])

  const groupedCeilingPermissions = useMemo(() => {
    const byResource = new Map<keyof typeof PERMISSION_CATALOG, typeof ceilingPermissions>()
    for (const permission of ceilingPermissions) {
      const resourceKey = CODE_TO_RESOURCE_KEY[permission.code]
      if (!resourceKey) continue
      const existing = byResource.get(resourceKey)
      if (existing) {
        existing.push(permission)
      } else {
        byResource.set(resourceKey, [permission])
      }
    }
    return (Object.keys(PERMISSION_CATALOG) as (keyof typeof PERMISSION_CATALOG)[])
      .filter((resourceKey) => byResource.has(resourceKey))
      .map((resourceKey) => ({ resourceKey, permissions: byResource.get(resourceKey)! }))
  }, [ceilingPermissions])

  const updateRoleType = useUpdateRoleType(id ?? '')
  const createRoleType = useCreateRoleType()

  const { selectedCodes, setSelectedCodes, setSelection, toggleCode } = usePermissionCodeSelection()
  // Codes dropped by a shrunken ceiling, surfaced as a visible notice instead of silently vanishing.
  const [prunedCodes, setPrunedCodes] = useState<string[]>([])

  useEffect(() => {
    if (roleType && !isCreateMode) {
      setValue('name', roleType.name)
      setValue('description', roleType.description ?? '')
      setValue('status', roleType.status ?? '')
      setSelection(roleType.permissions ?? [])
    }
  }, [roleType, isCreateMode, setValue, setSelection])

  // Drop any selected code outside the ceiling (backend would reject it anyway) and record it for the notice above.
  useEffect(() => {
    if (!permissionGroup) return
    const allowed = new Set(ceilingPermissions.map((p) => p.code))
    setSelectedCodes((prev) => {
      const dropped = [...prev].filter((c) => !allowed.has(c))
      if (dropped.length > 0) setPrunedCodes((existing) => [...new Set([...existing, ...dropped])])
      return new Set([...prev].filter((c) => allowed.has(c)))
    })
  }, [permissionGroup, ceilingPermissions, setSelectedCodes])

  const reservedCode = !isCreateMode && roleType ? isReservedTenantAdminCode(roleType.code, selectedTenantRecord?.code) : false

  const fieldError = (field: keyof RoleTypeFormValues) =>
    (touchedFields[field] || isSubmitted) ? errors[field]?.message : undefined

  const onSubmit = (values: RoleTypeFormValues) => {
    const permissions = [...selectedCodes]

    if (isCreateMode) {
      createRoleType.mutate(
        {
          code: values.code as RoleTypeCode,
          name: values.name,
          description: values.description || undefined,
          tenant: values.tenant,
          permissions,
        },
        {
          onSuccess: (res) => {
            if (res.data?.id) {
              navigate(ROLE_TYPE_ROUTES.ROLE_TYPE_DETAIL.replace(':id', res.data.id))
            }
          },
        },
      )
      return
    }

    updateRoleType.mutate({
      name: values.name,
      description: values.description || undefined,
      status: values.status || undefined,
      permissions,
    })
  }

  const mutation = isCreateMode ? createRoleType : updateRoleType

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(ROLE_TYPE_ROUTES.ROLE_TYPES)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to role types
      </button>

      {!isCreateMode && isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading role type…
        </div>
      )}

      {!isCreateMode && error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load role type. Please try again.
        </div>
      )}

      {(isCreateMode || (roleType && !isLoading)) && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div
            className="rounded-xl border p-5 mb-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            {isCreateMode ? (
              <>
                <div className="text-lg font-bold mb-3" style={{ color: 'var(--qms-text)' }}>
                  New role type
                </div>
                <div>
                  <FieldLabel htmlFor="tenant">
                    Company
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="tenant"
                    render={({ field }) => (
                      <TenantPicker id="tenant" tenants={tenants} value={field.value} onValueChange={field.onChange} />
                    )}
                  />
                  {fieldError('tenant') && <p className="text-[11px] mt-1.5 text-danger">{fieldError('tenant')}</p>}
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                    The available permissions below are limited to this company's own permission group.
                  </p>
                </div>
              </>
            ) : (
              roleType && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
                      {roleType.name}
                    </div>
                    <div className="text-[13px] truncate font-mono" style={{ color: 'var(--qms-text-muted)' }}>
                      {roleType.code}
                    </div>
                  </div>
                  <RoleTypeStatusPill status={roleType.status} />
                </div>
              )
            )}
          </div>

          <div
            className="rounded-xl border p-5 mb-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>
              {isCreateMode ? 'Details' : 'Edit role type'}
            </h2>

            <div className="space-y-4">
              {isCreateMode && (
                <div>
                  <FieldLabel htmlFor="code">
                    Code
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="code"
                    render={({ field }) => (
                      <Select key={field.value || 'empty'} value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger id="code" className="w-full">
                          <SelectValue placeholder="Select code">{(v) => (v ? String(v) : 'Select code')}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_TYPE_CODE_GROUPS.map((group) => (
                            <div key={group.label}>
                              {group.codes.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {fieldError('code') && <p className="text-[11px] mt-1.5 text-danger">{fieldError('code')}</p>}
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                    Must be one of the platform's allowed role-type codes.
                  </p>
                </div>
              )}

              {!isCreateMode && reservedCode && (
                <div>
                  <FieldLabel>
                    Code
                  </FieldLabel>
                  <div className="text-[13px] font-mono rounded-lg border px-3 py-2" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}>
                    {roleType?.code}
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                    This is the reserved, system-seeded company-admin role type code and cannot be changed.
                  </p>
                </div>
              )}

              <div>
                <FieldLabel htmlFor="name">
                  Name
                </FieldLabel>
                <Input id="name" type="text" {...register('name')} />
                {fieldError('name') && <p className="text-[11px] mt-1.5 text-danger">{fieldError('name')}</p>}
              </div>

              <div>
                <FieldLabel htmlFor="description">
                  Description
                </FieldLabel>
                <Textarea id="description" placeholder="Optional" {...register('description')} />
              </div>

              {!isCreateMode && (
                <div>
                  <FieldLabel htmlFor="status">
                    Status
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      // key forces a remount once the async value loads, to work around base-ui's Select controlled/uncontrolled quirk.
                      <Select key={field.value || 'empty'} value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger id="status" className="w-full">
                          <SelectValue placeholder="Select status">
                            {(v) => (v === 'active' ? 'Active' : v === 'inactive' ? 'Inactive' : 'Select status')}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}
            </div>
          </div>

          <div
            className="rounded-xl border p-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
                Permissions
              </h2>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
                {selectedCodes.size} of {ceilingPermissions.length} selected
              </span>
            </div>
            <p className="text-[12px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
              Only permissions granted to this company's own permission group can be assigned to a role type —
              that group is the ceiling for every role type under it.
            </p>

            {prunedCodes.length > 0 && (
              <div className="text-[12px] rounded-xl px-3 py-2 mb-4 bg-warning-soft border border-warning text-warning">
                <span className="font-semibold">Heads up:</span> this company's permission group no longer grants{' '}
                {prunedCodes.length === 1 ? 'this permission' : 'these permissions'}, so{' '}
                {prunedCodes.length === 1 ? "it's" : "they're"} no longer selected below:{' '}
                <span className="font-mono">{prunedCodes.join(', ')}</span>. Saving now will remove{' '}
                {prunedCodes.length === 1 ? 'it' : 'them'} from this role type.
              </div>
            )}

            {!tenant && (
              <div className="text-[13px] py-6 text-center rounded-lg border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                Select a company above to load its available permissions.
              </div>
            )}

            {tenant && isLoadingCeiling && (
              <div className="text-[13px] py-6 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                Loading available permissions…
              </div>
            )}

            {tenant && !isLoadingCeiling && !permissionGroup && (
              <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                This company has no permission group configured yet, so no permissions can be assigned.
              </div>
            )}

            {tenant && !isLoadingCeiling && permissionGroup && groupedCeilingPermissions.length > 0 && (
              <Accordion multiple defaultValue={groupedCeilingPermissions.map((g) => g.resourceKey)}>
                {groupedCeilingPermissions.map(({ resourceKey, permissions: resourcePermissions }) => {
                  const resourceSelectedCount = resourcePermissions.filter((p) => selectedCodes.has(p.code)).length
                  return (
                    <AccordionItem key={resourceKey} value={resourceKey}>
                      <AccordionTrigger style={{ color: 'var(--qms-text-muted)' }}>
                        <span className="flex items-center gap-2">
                          {PERMISSION_RESOURCE_LABELS[resourceKey]}
                          <span
                            className="normal-case tracking-normal font-medium text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{
                              background: resourceSelectedCount > 0 ? 'color-mix(in oklch, var(--qms-brand), transparent 88%)' : 'var(--qms-surface-hover)',
                              color: resourceSelectedCount > 0 ? 'var(--qms-brand)' : 'var(--qms-text-muted)',
                            }}
                          >
                            {resourceSelectedCount}/{resourcePermissions.length}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionPanel>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {resourcePermissions.map((permission) => (
                            <PermissionCheckboxRow
                              key={permission.code}
                              permission={permission}
                              checked={selectedCodes.has(permission.code)}
                              onToggle={toggleCode}
                            />
                          ))}
                        </div>
                      </AccordionPanel>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}

            {tenant && !isLoadingCeiling && permissionGroup && groupedCeilingPermissions.length === 0 && (
              <div className="text-[13px] py-6 text-center rounded-lg border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                This company's permission group grants no permissions yet.
              </div>
            )}

            <MutationStatusBanner mutation={mutation} showSuccess={!isCreateMode} />

            <Button type="submit" disabled={mutation.isPending} className="mt-4">
              {mutation.isPending ? 'Saving…' : isCreateMode ? 'Create role type' : 'Save changes'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default RoleTypeDetailPage
