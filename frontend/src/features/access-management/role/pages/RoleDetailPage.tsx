import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRole } from '@/features/access-management/role/hooks/useRole'
import { useUpdateRole } from '@/features/access-management/role/hooks/useUpdateRole'
import { useCreateRole } from '@/features/access-management/role/hooks/useCreateRole'
import { useRolePermissionPicker } from '@/features/access-management/role/hooks/useRolePermissionPicker'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useDivisions } from '@/features/crm/hooks/useDivisions'
import { ROLE_ROUTES } from '@/features/access-management/role/role.routes'
import { PHARMA_SUPERVISOR_PARENT_CODE } from '@/features/access-management/role/constants/pharmaSupervisorTree'
import RoleStatusPill from '@/features/access-management/role/components/RoleStatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createRoleSchema, updateRoleSchema } from '@/features/access-management/role/schemas/role.schemas'
import type { RolePopulatedRoleType, RolePopulatedUser, RoleStatus } from '@/types/accessManagement.types'

// Combined create-flow + edit page for Role — the "ID card" entity binding
// one user to one RoleType within a tenant:
//   - no `:id` param (route is ROLE_NEW)          -> create form (embeds a
//     full user-registration payload, per CreateRolePayload.user)
//   - `:id` param present (route is ROLE_DETAIL)  -> load + edit form
//
// Mirrors `@/features/access-management/role-type/pages/RoleTypeDetailPage.tsx`'s overall
// shape (back link, header summary card, editable card(s), save button wired
// to a mutation with isPending/isError/isSuccess feedback) and reuses its
// ceiling-scoped permission-picker pattern via `useRolePermissionPicker`,
// which in turn reuses role-type's `useTenantPermissionGroup` — this mirrors
// backend `role.service.ts`'s `handlePermissionUpdate`, which resolves the
// ceiling via `PermissionGroupService.search({ tenant: ctx.tenant._id })`,
// the exact same call RoleType's ceiling check makes.
//
// TWO IMPORTANT DIFFERENCES from RoleType's permission picker:
//
// 1. Forbidden-code exclusion: per role.service.ts's
//    `ROLE_FORBIDDEN_PERMISSIONS = [TENANT_PERMISSIONS.ADMIN.code,
//    TENANT_PERMISSIONS.MANAGE.code, SYSTEM_PERMISSIONS.MANAGE.code]`, a Role
//    may NEVER directly hold 'tenant:admin' / 'tenant:manage' /
//    'system:manage' — "no bypass, applies even to system" per that file's
//    own comment. useRolePermissionPicker excludes these three codes from
//    its candidate list entirely, it does not just rely on the backend's 403.
//
// 2. RoleType-scoped ceiling: a Role's `permissions` field is conceptually
//    "elevated permissions" layered ON TOP of whatever the bound RoleType
//    already grants (e.g. a same-domain grant like 'sales.manage' for one
//    person) — not a duplicate of the RoleType's own list, and not an
//    unbounded pick from the full tenant PermissionGroup ceiling either. So
//    the offered choices are the INTERSECTION of the tenant's PermissionGroup
//    ceiling and the currently-selected RoleType's own `permissions` array,
//    minus the 3 forbidden codes — never a free-for-all across the whole
//    PermissionGroup.
//
// Form state uses react-hook-form + zodResolver (mirrors auth/LoginForm.tsx's
// pattern — the only other RHF usage in the codebase so far), resolving
// against createRoleSchema in create mode and updateRoleSchema in edit mode.
// One RoleFormValues shape covers both: most fields are optional at the type
// level since "required-ness" differs by mode and is enforced by whichever
// schema the resolver is pointed at, not by the TS type itself. The
// elevated-permissions picker is NOT part of this form — it's driven by
// useRolePermissionPicker (a Set<string>, not a plain field) and merged into
// the payload at submit time, same as before this migration.

// Never offered as a NEW choice in the Role Type picker below — 'admin' is
// minted once per tenant during onboarding, and 'pharma-division-head' is
// minted exactly once per division (CreateDivisionModal), transactionally.
// Only filters the picker's rendered options; the underlying `roleTypes`
// list stays unfiltered so editing a pre-existing Role of one of these
// types still resolves its name/permissions correctly.
const RESTRICTED_ROLETYPE_CODES = ['admin', 'pharma-division-head']

interface RoleFormValues {
  code: string
  name: string
  description: string
  status: RoleStatus | ''
  tenant: string
  roleType: string
  division: string
  supervisor: string
  userFirstName: string
  userLastName: string
  userEmail: string
  userPassword: string
  userPhone: string
  userGender: '' | 'male' | 'female' | 'other'
  userStatus: '' | 'active' | 'inactive' | 'suspended' | 'deleted'
}

const EMPTY_FORM_VALUES: RoleFormValues = {
  code: '',
  name: '',
  description: '',
  status: '',
  tenant: '',
  roleType: '',
  division: '',
  supervisor: '',
  userFirstName: '',
  userLastName: '',
  userEmail: '',
  userPassword: '',
  userPhone: '',
  userGender: '',
  userStatus: '',
}

// createRoleSchema/updateRoleSchema (role.schemas.ts) use the wire payload's
// own field names/shape (`type`, nested `user: {firstName, ...}`) — not this
// form's flat RoleFormValues (`roleType`, `userFirstName`, ...), since those
// schemas are shared with the raw CreateRolePayload/UpdateRolePayload types
// elsewhere. Rather than reshape the schemas themselves (used outside this
// page too) or maintain a parallel RHF-shaped schema (drifts from the real
// one), this resolver translates RoleFormValues -> the schema's payload
// shape, runs zodResolver against THAT, then maps any resulting error paths
// back to their RoleFormValues field names so RHF's `errors.<field>` still
// resolves correctly for each input.
//
// IMPORTANT: react-hook-form's zodResolver returns `errors` as a NESTED
// object mirroring the schema shape (e.g. `errors.user.firstName`), NOT
// flat dot-notation string keys (`errors['user.firstName']`) — confirmed by
// directly running zodResolver against a nested test schema. The lookup
// table below is therefore two levels: top-level payload field -> form
// field, plus a separate nested walk for `user.*`.
const TOP_LEVEL_TO_FORM_FIELD: Record<string, keyof RoleFormValues> = {
  type: 'roleType',
}
const USER_FIELD_TO_FORM_FIELD: Record<string, keyof RoleFormValues> = {
  firstName: 'userFirstName',
  lastName: 'userLastName',
  email: 'userEmail',
  password: 'userPassword',
  phone: 'userPhone',
  gender: 'userGender',
  status: 'userStatus',
}

const toRoleFormResolver = (schema: typeof createRoleSchema | typeof updateRoleSchema): Resolver<RoleFormValues> => {
  // zodResolver's own generic is tied to the schema's payload shape, not
  // RoleFormValues — this resolver never uses react-hook-form's `context`
  // option (useForm below doesn't pass one), so it's safe to not thread it
  // through to the base resolver rather than fight the type mismatch.
  const baseResolver = zodResolver(schema) as (payload: unknown, context: unknown, options: unknown) => Promise<{
    values: Record<string, unknown>
    errors: Record<string, { message?: string; type?: string } | Record<string, { message?: string; type?: string }>>
  }>

  return async (values, context, options) => {
    const payload = {
      code: values.code,
      name: values.name,
      description: values.description,
      type: values.roleType,
      tenant: values.tenant,
      division: values.division,
      supervisor: values.supervisor,
      status: values.status || undefined,
      user: {
        firstName: values.userFirstName,
        lastName: values.userLastName,
        email: values.userEmail,
        password: values.userPassword,
        phone: values.userPhone,
        gender: values.userGender || undefined,
        status: values.userStatus || undefined,
      },
    }
    const result = await baseResolver(payload, context, options)
    const mappedErrors: Record<string, unknown> = {}
    for (const [path, err] of Object.entries(result.errors)) {
      if (path === 'user' && err && typeof err === 'object' && !('message' in err)) {
        for (const [userField, userErr] of Object.entries(err)) {
          const formField = USER_FIELD_TO_FORM_FIELD[userField] ?? userField
          mappedErrors[formField] = userErr
        }
        continue
      }
      const formField = TOP_LEVEL_TO_FORM_FIELD[path] ?? path
      mappedErrors[formField] = err
    }
    const hasErrors = Object.keys(mappedErrors).length > 0
    // react-hook-form resolvers return the ORIGINAL form values (RoleFormValues
    // shape) on success — `values` here is a real RoleFormValues already; only
    // `errors` needed reshaping from the payload's field names to this form's.
    return { values: hasErrors ? {} : values, errors: mappedErrors } as never
  }
}

const RoleDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const isCreateMode = !id
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { data, isLoading, error } = useRole(id)
  const role = data?.data ?? null

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors, touchedFields },
  } = useForm<RoleFormValues>({
    resolver: isCreateMode ? toRoleFormResolver(createRoleSchema) : toRoleFormResolver(updateRoleSchema),
    mode: 'onChange',
    defaultValues: {
      ...EMPTY_FORM_VALUES,
      tenant: searchParams.get('tenant') ?? '',
      roleType: searchParams.get('roleType') ?? '',
    },
  })

  const tenant = watch('tenant')
  const roleType = watch('roleType')
  const division = watch('division')
  const supervisor = watch('supervisor')
  const userEmail = watch('userEmail')

  // limit: '20' — the backend defaults to 10 results; with 16+ active
  // tenants seeded, `qms` (created earliest, sorts last) fell past that
  // window and never appeared in this picker at all. Confirmed live 2026-08-05.
  const { data: tenantsData } = useTenants({ limit: '20' })
  const tenants = tenantsData?.data?.items ?? []

  // On create, the tenant is chosen via a picker (optionally pre-filled from
  // ?tenant=<id> query param, set in defaultValues above); on edit, it comes
  // from the loaded Role's populated tenant relation.
  useEffect(() => {
    if (role && !isCreateMode) {
      // role.tenant is a raw ObjectId string on create/update responses but a
      // populated {_id, name, code} object on GET-by-id/search — see
      // RolePopulatedTenant's comment in accessManagement.types.ts. Reading
      // `.id` here (rather than `._id`) always fell through to '', which
      // permanently disabled the Role Type picker below since it requires a
      // resolved tenant id.
      const tenantValue = role.tenant
      setValue('tenant', typeof tenantValue === 'string' ? tenantValue : (tenantValue?._id ?? ''))
    }
  }, [role, isCreateMode, setValue])

  const { data: roleTypesData } = useRoleTypes({ tenant: tenant || undefined }, !!tenant)
  const roleTypes = roleTypesData?.data?.items ?? []

  const createRole = useCreateRole()
  const updateRole = useUpdateRole(id ?? '')

  const {
    permissionGroup,
    isLoadingCeiling,
    permissionGroupCeilingCodes,
    candidatePermissions,
    setSelectedCodes,
    effectiveSelectedCodes,
    toggleCode,
  } = useRolePermissionPicker(tenant || undefined, roleType, roleTypes)

  // Pharma role hierarchy (create only — see role.service.ts's
  // handleDivision/handleSupervisor, both gated on entity.isNew): a division
  // is required for a non-root pharma role type, and a supervisor must be an
  // existing Role of the immediate parent type within that same division.
  const selectedRoleTypeCode = roleTypes.find((rt) => rt.id === roleType)?.code
  const supervisorParentCode = selectedRoleTypeCode ? PHARMA_SUPERVISOR_PARENT_CODE[selectedRoleTypeCode] : undefined
  const needsDivision = selectedRoleTypeCode !== undefined && selectedRoleTypeCode in PHARMA_SUPERVISOR_PARENT_CODE
  const needsSupervisor = !!supervisorParentCode

  // NOT `tenantId` — SearchDivisionQuery's own field is stale (see its
  // comment); the real backend query param is `tenant`
  // (division.validators.ts's SearchDivisionQuerySchema), confirmed live
  // 2026-08-05. Sending `tenantId` compiles but is silently ignored
  // server-side, returning EVERY tenant's divisions unscoped — asserting the
  // param shape here rather than widening SearchDivisionQuery itself, since
  // fixing every other caller is a separate, already-flagged follow-up.
  const { data: divisionsData } = useDivisions(
    { tenant: tenant || undefined } as unknown as { tenantId?: string },
    isCreateMode && needsDivision && !!tenant,
  )
  const divisions = divisionsData?.data?.items ?? []

  // Resolved from the roleTypes list already fetched above — no second
  // useRoleTypes call needed, the parent code's id is already in that
  // response since it's the same tenant's full RoleType list.
  const parentTypeId = roleTypes.find((rt) => rt.code === supervisorParentCode)?.id

  // status: 'active' — the backend's own supervisor validation never checks
  // the candidate's status (confirmed live 2026-08-05: an inactive Role is
  // silently accepted as a supervisor), so this filter is the only thing
  // keeping an inactive/deactivated person out of the picker.
  const { data: supervisorCandidatesData, isLoading: isLoadingSupervisors } = useRoles(
    { tenant: tenant || undefined, division: division || undefined, type: parentTypeId, status: 'active' },
    isCreateMode && needsSupervisor && !!tenant && !!division && !!parentTypeId,
  )
  const supervisorCandidates = supervisorCandidatesData?.data?.items ?? []

  useEffect(() => {
    setValue('division', '')
    setValue('supervisor', '')
    // Only reset when roleType/tenant actually change — setValue itself is
    // stable across renders (react-hook-form), so it's safe to omit here
    // without re-adding the same feedback-loop risk useRolePermissionPicker's
    // own comment warns about; division/supervisor are never read by this
    // effect's own trigger condition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleType, tenant])

  useEffect(() => {
    if (role && !isCreateMode) {
      const userValue = role.user as RolePopulatedUser | string
      reset({
        ...EMPTY_FORM_VALUES,
        name: role.name,
        description: role.description ?? '',
        status: role.status ?? '',
        // role.type has the same populated-vs-string duality as role.tenant
        // above — see RolePopulatedRoleType's comment.
        tenant: typeof role.tenant === 'string' ? role.tenant : (role.tenant?._id ?? ''),
        roleType: typeof role.type === 'string' ? role.type : (role.type?._id ?? ''),
        userFirstName: typeof userValue !== 'string' ? (userValue.firstName ?? '') : '',
        userLastName: typeof userValue !== 'string' ? (userValue.lastName ?? '') : '',
        userEmail: typeof userValue !== 'string' ? (userValue.email ?? '') : '',
        userPhone: typeof userValue !== 'string' ? (userValue.phone ?? '') : '',
        userGender: typeof userValue !== 'string' ? ((userValue.gender as RoleFormValues['userGender']) ?? '') : '',
        userStatus: typeof userValue !== 'string' ? ((userValue.status as RoleFormValues['userStatus']) ?? '') : '',
      })
      // role.permissions is a bare string[] on the wire (see RoleEntity
      // comment in accessManagement.types.ts) — no .code projection needed.
      setSelectedCodes(new Set(role.permissions ?? []))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, isCreateMode])

  const onSubmit = (values: RoleFormValues) => {
    const permissions = [...effectiveSelectedCodes]

    if (isCreateMode) {
      createRole.mutate(
        {
          code: values.code,
          name: values.name,
          description: values.description || undefined,
          type: values.roleType,
          tenant: values.tenant,
          division: values.division || undefined,
          supervisor: values.supervisor || undefined,
          permissions,
          user: {
            firstName: values.userFirstName,
            lastName: values.userLastName || undefined,
            email: values.userEmail,
            password: values.userPassword,
            phone: values.userPhone || undefined,
            gender: values.userGender || undefined,
          },
        },
        {
          onSuccess: (res) => {
            if (res.data?.id) {
              navigate(ROLE_ROUTES.ROLE_DETAIL.replace(':id', res.data.id))
            }
          },
        },
      )
      return
    }

    updateRole.mutate({
      name: values.name,
      description: values.description || undefined,
      status: values.status || undefined,
      type: values.roleType || undefined,
      permissions,
      user: {
        firstName: values.userFirstName || undefined,
        lastName: values.userLastName || undefined,
        status: values.userStatus || undefined,
        gender: values.userGender || undefined,
      },
    })
  }

  // needsDivision/needsSupervisor block submission on create via the
  // schema's own refinement path is NOT used here — those two fields'
  // "required when this role type needs one" rule depends on data
  // (roleTypes/PHARMA_SUPERVISOR_PARENT_CODE) the static Zod schema can't
  // see, so it stays as an imperative guard layered in front of
  // handleSubmit, exactly as it worked before this migration.
  const guardedSubmit = handleSubmit((values) => {
    if (isCreateMode) {
      if (needsDivision && !values.division) return
      if (needsSupervisor && !values.supervisor) return
    }
    onSubmit(values)
  })

  const mutation = isCreateMode ? createRole : updateRole
  const roleTypeName = !isCreateMode && role ? (role.type as RolePopulatedRoleType)?.name : undefined

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

      {!isCreateMode && isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading role…
        </div>
      )}

      {!isCreateMode && error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load role. Please try again.
        </div>
      )}

      {(isCreateMode || (role && !isLoading)) && (
        <form onSubmit={guardedSubmit} noValidate>
          <div
            className="rounded-xl border p-5 mb-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            {isCreateMode ? (
              <>
                <div className="text-lg font-bold mb-3" style={{ color: 'var(--qms-text)' }}>
                  New role
                </div>
                <div>
                  <Label
                    htmlFor="tenant"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Company
                  </Label>
                  <Controller
                    control={control}
                    name="tenant"
                    render={({ field }) => (
                      <Select
                        key={field.value || 'empty'}
                        value={field.value || undefined}
                        onValueChange={(v) => {
                          field.onChange(v ?? '')
                          setValue('roleType', '')
                        }}
                      >
                        <SelectTrigger id="tenant" className="w-full">
                          <SelectValue placeholder="Select company">
                            {(v) => {
                              const t = tenants.find((t) => t.id === v)
                              return t ? `${t.name} (${t.code})` : 'Select company'
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {tenants.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} ({t.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {touchedFields.tenant && errors.tenant && (
                    <p className="text-xs text-danger mt-1.5">{errors.tenant.message}</p>
                  )}
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                    The role type and elevated permissions below are scoped to this company.
                  </p>
                </div>
              </>
            ) : (
              role && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
                      {role.name}
                    </div>
                    <div className="text-[13px] truncate font-mono" style={{ color: 'var(--qms-text-muted)' }}>
                      {role.code}
                    </div>
                    {roleTypeName && (
                      <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                        Role type: {roleTypeName}
                      </div>
                    )}
                  </div>
                  <RoleStatusPill status={role.status} />
                </div>
              )
            )}
          </div>

          <div
            className="rounded-xl border p-5 mb-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>
              {isCreateMode ? 'Details' : 'Edit role'}
            </h2>

            <div className="space-y-4">
              {isCreateMode && (
                <div>
                  <Label
                    htmlFor="code"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Code
                  </Label>
                  <Input id="code" type="text" placeholder="e.g. site-manager-john" {...register('code')} />
                  {touchedFields.code && errors.code && <p className="text-xs text-danger mt-1.5">{errors.code.message}</p>}
                </div>
              )}

              <div>
                <Label
                  htmlFor="name"
                  className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                  style={{ color: 'var(--qms-text-muted)' }}
                >
                  Name
                </Label>
                <Input id="name" type="text" {...register('name')} />
                {touchedFields.name && errors.name && <p className="text-xs text-danger mt-1.5">{errors.name.message}</p>}
              </div>

              <div>
                <Label
                  htmlFor="description"
                  className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                  style={{ color: 'var(--qms-text-muted)' }}
                >
                  Description
                </Label>
                <Textarea id="description" placeholder="Optional" {...register('description')} />
              </div>

              <div>
                <Label
                  htmlFor="roleType"
                  className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                  style={{ color: 'var(--qms-text-muted)' }}
                >
                  Role Type
                </Label>
                <Controller
                  control={control}
                  name="roleType"
                  render={({ field }) => (
                    <Select key={field.value || 'empty'} value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? '')} disabled={!tenant}>
                      <SelectTrigger id="roleType" className="w-full">
                        <SelectValue placeholder={tenant ? 'Select role type' : 'Select a company first'}>
                          {(v) => {
                            const rt = roleTypes.find((rt) => rt.id === v)
                            return rt ? `${rt.name} (${rt.code})` : tenant ? 'Select role type' : 'Select a company first'
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {roleTypes.filter((rt) => !RESTRICTED_ROLETYPE_CODES.includes(rt.code)).map((rt) => (
                          <SelectItem key={rt.id} value={rt.id}>
                            {rt.name} ({rt.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {touchedFields.roleType && errors.roleType && (
                  <p className="text-xs text-danger mt-1.5">{errors.roleType.message}</p>
                )}
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                  Scoped to the same company this role belongs to.
                </p>
              </div>

              {isCreateMode && needsDivision && (
                <div>
                  <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Division
                  </Label>
                  <Controller
                    control={control}
                    name="division"
                    render={({ field }) => (
                      <Select
                        key={field.value || 'empty'}
                        value={field.value || undefined}
                        onValueChange={(v) => {
                          field.onChange(v ?? '')
                          setValue('supervisor', '')
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select division">
                            {(v) => divisions.find((d) => d.id === v)?.name ?? 'Select division'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {divisions.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              {isCreateMode && needsSupervisor && (
                <div>
                  <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Supervisor
                  </Label>
                  <Controller
                    control={control}
                    name="supervisor"
                    render={({ field }) => (
                      <Select key={field.value || 'empty'} value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? '')} disabled={!division}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={!division ? 'Select a division first' : isLoadingSupervisors ? 'Loading…' : 'Select supervisor'}>
                            {(v) => {
                              const s = supervisorCandidates.find((r) => r.id === v)
                              return s ? `${s.name} (${s.code})` : 'Select supervisor'
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {supervisorCandidates.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {division && !isLoadingSupervisors && supervisorCandidates.length === 0 && (
                    <p className="text-[11px] mt-1.5 text-danger">
                      No eligible supervisor exists in this division yet — create one first.
                    </p>
                  )}
                </div>
              )}

              {!isCreateMode && (
                <div>
                  <Label
                    htmlFor="status"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Status
                  </Label>
                  {/* key={status || 'empty'} forces a fresh mount once the real
                      value loads from the async fetch — base-ui's Select
                      decides controlled-vs-uncontrolled on its very first
                      render and never revisits it, so without this the
                      trigger permanently shows "Select status" even after
                      the real value arrives (same bug as
                      TenantDetailPage.tsx/GeoProfileDetailPage.tsx/
                      CampDetailPageReal.tsx). Data-only display bug — the
                      underlying value was always correct. */}
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select key={field.value || 'empty'} value={field.value || undefined} onValueChange={(v) => field.onChange(v as RoleStatus)}>
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
            className="rounded-xl border p-5 mb-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>
              {isCreateMode ? 'User account' : 'Bound user'}
            </h2>
            <p className="text-[12px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
              {isCreateMode
                ? 'A role binds exactly one user — creating a role registers that user in the same step.'
                : 'Edit the user bound to this role. Email cannot be changed here.'}
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="userFirstName"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    First name
                  </Label>
                  <Input id="userFirstName" type="text" {...register('userFirstName')} />
                  {touchedFields.userFirstName && errors.userFirstName && (
                    <p className="text-xs text-danger mt-1.5">{errors.userFirstName.message}</p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="userLastName"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Last name
                  </Label>
                  <Input id="userLastName" type="text" {...register('userLastName')} />
                </div>
              </div>

              {isCreateMode && (
                <>
                  <div>
                    <Label
                      htmlFor="userEmail"
                      className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                      style={{ color: 'var(--qms-text-muted)' }}
                    >
                      Email
                    </Label>
                    <Input id="userEmail" type="email" {...register('userEmail')} />
                    {touchedFields.userEmail && errors.userEmail && (
                      <p className="text-xs text-danger mt-1.5">{errors.userEmail.message}</p>
                    )}
                  </div>
                  <div>
                    <Label
                      htmlFor="userPassword"
                      className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                      style={{ color: 'var(--qms-text-muted)' }}
                    >
                      Password
                    </Label>
                    <Input id="userPassword" type="password" {...register('userPassword')} />
                    {touchedFields.userPassword && errors.userPassword && (
                      <p className="text-xs text-danger mt-1.5">{errors.userPassword.message}</p>
                    )}
                  </div>
                </>
              )}

              {!isCreateMode && userEmail && (
                <div>
                  <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Email
                  </Label>
                  <div className="text-[13px] rounded-lg border px-3 py-2" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}>
                    {userEmail}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="userPhone"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Phone
                  </Label>
                  <Input id="userPhone" type="text" placeholder="Optional" disabled={!isCreateMode} {...register('userPhone')} />
                </div>
                <div>
                  <Label
                    htmlFor="userGender"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Gender
                  </Label>
                  <Controller
                    control={control}
                    name="userGender"
                    render={({ field }) => (
                      <Select key={field.value || 'empty'} value={field.value || undefined} onValueChange={(v) => field.onChange((v ?? '') as RoleFormValues['userGender'])}>
                        <SelectTrigger id="userGender" className="w-full">
                          <SelectValue placeholder="Optional">
                            {(v) => (v === 'male' ? 'Male' : v === 'female' ? 'Female' : v === 'other' ? 'Other' : 'Optional')}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {!isCreateMode && (
                <div>
                  <Label
                    htmlFor="userStatus"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    User status
                  </Label>
                  <Controller
                    control={control}
                    name="userStatus"
                    render={({ field }) => (
                      <Select key={field.value || 'empty'} value={field.value || undefined} onValueChange={(v) => field.onChange((v ?? '') as RoleFormValues['userStatus'])}>
                        <SelectTrigger id="userStatus" className="w-full">
                          <SelectValue placeholder="Select user status">
                            {(v) => {
                              const labels: Record<string, string> = { active: 'Active', inactive: 'Inactive', suspended: 'Suspended', deleted: 'Deleted' }
                              return labels[v as string] ?? 'Select user status'
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="deleted">Deleted</SelectItem>
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
                Elevated permissions
              </h2>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
                {effectiveSelectedCodes.size} of {candidatePermissions.length} selected
              </span>
            </div>
            <p className="text-[12px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
              Optional, temporary grants layered on top of the bound role type's own permissions (e.g. a same-domain
              grant like <span className="font-mono">sales.manage</span> for this one person) — not a replacement for
              them. Choices are limited to permissions the role type already has AND that this company's permission
              group allows.{' '}
              <span className="font-semibold">
                Admin Company, Manage Company, and system-manage can never be granted here.
              </span>
            </p>

            {!tenant && (
              <div className="text-[13px] py-6 text-center rounded-lg border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                Select a company above to load available elevated permissions.
              </div>
            )}

            {tenant && !roleType && (
              <div className="text-[13px] py-6 text-center rounded-lg border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                Select a role type above to see what can be elevated on top of it.
              </div>
            )}

            {tenant && roleType && isLoadingCeiling && (
              <div className="text-[13px] py-6 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                Loading available permissions…
              </div>
            )}

            {tenant && roleType && !isLoadingCeiling && !permissionGroup && (
              <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                This company has no permission group configured yet, so no elevated permissions can be assigned.
              </div>
            )}

            {tenant && roleType && !isLoadingCeiling && permissionGroup && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {candidatePermissions.map((permission) => {
                  const checked = effectiveSelectedCodes.has(permission.code)
                  return (
                    <label
                      key={permission.code}
                      className="flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                      style={{
                        borderColor: checked ? 'var(--qms-brand)' : 'var(--qms-border)',
                        background: checked ? 'color-mix(in oklch, var(--qms-brand), transparent 92%)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCode(permission.code)}
                        className="mt-0.5 accent-(--qms-brand)"
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                          {permission.name}
                        </span>
                        <span className="block text-[11px] font-mono truncate" style={{ color: 'var(--qms-text-muted)' }}>
                          {permission.code}
                        </span>
                      </span>
                    </label>
                  )
                })}

                {candidatePermissions.length === 0 && (
                  <div className="text-[13px] py-6 text-center col-span-full" style={{ color: 'var(--qms-text-muted)' }}>
                    No permissions are available to elevate — either the role type has none, or none of them are
                    within this company's permission group ceiling.
                  </div>
                )}
              </div>
            )}

            {permissionGroupCeilingCodes.size === 0 && permissionGroup && (
              <p className="text-[11px] mt-3" style={{ color: 'var(--qms-text-muted)' }}>
                This company's permission group currently grants no permissions.
              </p>
            )}

            {isCreateMode && needsDivision && !division && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
                Select a division for this role type.
              </div>
            )}
            {isCreateMode && needsSupervisor && division && !supervisor && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
                {supervisorCandidates.length === 0 && !isLoadingSupervisors
                  ? 'No eligible supervisor exists in this division yet — create one first.'
                  : 'Select a supervisor for this role type.'}
              </div>
            )}

            {mutation.isError && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
                {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                  'Failed to save changes.'}
              </div>
            )}
            {mutation.isSuccess && !isCreateMode && (
              <div className="text-xs rounded-xl px-3 py-2 bg-success-soft text-success mt-4">
                Saved.
              </div>
            )}

            <Button type="submit" disabled={mutation.isPending} className="mt-4">
              {mutation.isPending ? 'Saving…' : isCreateMode ? 'Create role' : 'Save changes'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default RoleDetailPage
