import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import type { ZodIssue } from 'zod'
import { useRole } from '@/features/access-management/role/hooks/useRole'
import { useUpdateRole } from '@/features/access-management/role/hooks/useUpdateRole'
import { useCreateRole } from '@/features/access-management/role/hooks/useCreateRole'
import { useTenantPermissionGroup } from '@/features/access-management/role-type/hooks/useTenantPermissionGroup'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { ROLE_ROUTES } from '@/features/access-management/role/role.routes'
import { ROLE_FORBIDDEN_PERMISSIONS } from '@/features/access-management/role/constants/roleForbiddenPermissions'
import RoleStatusPill from '@/features/access-management/role/components/RoleStatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createRoleSchema, updateRoleSchema } from '@/features/access-management/role/schemas/role.schemas'
import { useScrollIntoViewOnChange } from '@/hooks/useScrollIntoViewOnChange'
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
// ceiling-scoped permission-picker pattern via the SAME
// `useTenantPermissionGroup` hook (role-type's, not duplicated) — this
// mirrors backend `role.service.ts`'s `handlePermissionUpdate`, which
// resolves the ceiling via `PermissionGroupService.search({ tenant:
// ctx.tenant._id })`, the exact same call RoleType's ceiling check makes.
//
// TWO IMPORTANT DIFFERENCES from RoleType's permission picker:
//
// 1. Forbidden-code exclusion: per role.service.ts's
//    `ROLE_FORBIDDEN_PERMISSIONS = [TENANT_PERMISSIONS.ADMIN.code,
//    TENANT_PERMISSIONS.MANAGE.code, SYSTEM_PERMISSIONS.MANAGE.code]`, a Role
//    may NEVER directly hold 'tenant:admin' / 'tenant:manage' /
//    'system:manage' — "no bypass, applies even to system" per that file's
//    own comment. The picker below excludes these three codes from its
//    candidate list entirely (constants/roleForbiddenPermissions.ts), it does
//    not just rely on the backend's 403.
//
// 2. RoleType-scoped ceiling: a Role's `permissions` field is conceptually
//    "elevated permissions" layered ON TOP of whatever the bound RoleType
//    already grants (e.g. a same-domain grant like 'sales.manage' for one
//    person) — not a duplicate of the RoleType's own list, and not an
//    unbounded pick from the full tenant PermissionGroup ceiling either. So
//    the offered choices here are the INTERSECTION of the tenant's
//    PermissionGroup ceiling and the currently-selected RoleType's own
//    `permissions` array, minus the 3 forbidden codes — never a free-for-all
//    across the whole PermissionGroup.

// Zod 4's built-in type-mismatch message ("Invalid input: expected string,
// received undefined") never names the field — only the custom `.min()`
// messages in role.schemas.ts do, and those are skipped whenever the value
// passed in is actually `undefined` rather than an empty string (which is
// exactly what `code || undefined`-style coercion produced for an empty
// required field). Falling back to the field's own label via its path keeps
// the message actionable even when a future schema change reintroduces a
// bare type-mismatch error.
const ROLE_FIELD_LABELS: Record<string, string> = {
  code: 'Code',
  name: 'Name',
  type: 'Role type',
  tenant: 'Tenant',
  'user.firstName': "User's first name",
  'user.email': 'User email',
  'user.password': 'Password',
}

const formatZodIssue = (issue: ZodIssue): string => {
  const path = issue.path.join('.')
  const label = ROLE_FIELD_LABELS[path]
  if (!label || issue.message.toLowerCase().includes(label.toLowerCase())) return issue.message
  return `${label}: ${issue.message}`
}

const RoleDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const isCreateMode = !id
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { data, isLoading, error } = useRole(id)
  const role = data?.data ?? null

  const { data: tenantsData } = useTenants({})
  const tenants = tenantsData?.data?.items ?? []

  // On create, the tenant is chosen via a picker (optionally pre-filled from
  // ?tenant=<id> query param); on edit, it comes from the loaded Role's
  // populated tenant relation.
  const [tenant, setTenant] = useState(searchParams.get('tenant') ?? '')
  useEffect(() => {
    if (role && !isCreateMode) {
      // role.tenant is a raw ObjectId string on create/update responses but a
      // populated {_id, name, code} object on GET-by-id/search — see
      // RolePopulatedTenant's comment in accessManagement.types.ts. Reading
      // `.id` here (rather than `._id`) always fell through to '', which
      // permanently disabled the Role Type picker below since it requires a
      // resolved tenant id.
      const tenantValue = role.tenant
      setTenant(typeof tenantValue === 'string' ? tenantValue : (tenantValue?._id ?? ''))
    }
  }, [role, isCreateMode])

  const { data: roleTypesData } = useRoleTypes({ tenant: tenant || undefined })
  const roleTypes = roleTypesData?.data?.items ?? []

  const { permissionGroup, isLoading: isLoadingCeiling } = useTenantPermissionGroup(tenant || undefined)
  const permissionGroupCeilingCodes = useMemo(
    () => new Set((permissionGroup?.permissions ?? []).map((p) => p.code)),
    [permissionGroup],
  )

  const createRole = useCreateRole()
  const updateRole = useUpdateRole(id ?? '')

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<RoleStatus | ''>('')
  const [roleType, setRoleType] = useState(searchParams.get('roleType') ?? '')
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [formError, setFormError] = useState<string | null>(null)
  const errorRef = useScrollIntoViewOnChange<HTMLDivElement>(formError)

  // Embedded user-registration fields (create) / limited user-edit fields (update).
  const [userFirstName, setUserFirstName] = useState('')
  const [userLastName, setUserLastName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [userGender, setUserGender] = useState<'' | 'male' | 'female' | 'other'>('')
  const [userStatus, setUserStatus] = useState<'' | 'active' | 'inactive' | 'suspended' | 'deleted'>('')

  useEffect(() => {
    if (role && !isCreateMode) {
      setName(role.name)
      setDescription(role.description ?? '')
      setStatus(role.status ?? '')
      // role.permissions is a bare string[] on the wire (see RoleEntity
      // comment in accessManagement.types.ts) — no .code projection needed.
      setSelectedCodes(new Set(role.permissions ?? []))

      // role.type has the same populated-vs-string duality as role.tenant
      // above — see RolePopulatedRoleType's comment.
      const typeValue = role.type
      setRoleType(typeof typeValue === 'string' ? typeValue : (typeValue?._id ?? ''))

      const userValue = role.user as RolePopulatedUser | string
      if (typeof userValue !== 'string') {
        setUserFirstName(userValue.firstName ?? '')
        setUserLastName(userValue.lastName ?? '')
        setUserEmail(userValue.email ?? '')
        setUserPhone(userValue.phone ?? '')
        setUserGender((userValue.gender as '' | 'male' | 'female' | 'other') ?? '')
        setUserStatus((userValue.status as typeof userStatus) ?? '')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, isCreateMode])

  // The bound RoleType's own permission codes — the "floor" that elevated
  // permissions build on top of. Recomputed whenever the roleType selection
  // or the loaded roleTypes list changes.
  const boundRoleTypePermissionCodes = useMemo(() => {
    const found = roleTypes.find((rt) => rt.id === roleType)
    // found.permissions is a bare string[] on the wire (RoleTypeEntity) — no
    // .code projection needed.
    return new Set(found?.permissions ?? [])
  }, [roleTypes, roleType])

  // Candidate elevated permissions = tenant PermissionGroup ceiling
  // ∩ bound RoleType's own permissions, minus the 3 forbidden codes —
  // never offered as an unbounded pick across the whole PermissionGroup.
  const candidatePermissions = useMemo(() => {
    return (permissionGroup?.permissions ?? []).filter(
      (p) => boundRoleTypePermissionCodes.has(p.code) && !ROLE_FORBIDDEN_PERMISSIONS.includes(p.code),
    )
  }, [permissionGroup, boundRoleTypePermissionCodes])

  // Whenever the candidate set shrinks (ceiling, role type, or forbidden-list
  // change), drop any selected code that has fallen outside it.
  useEffect(() => {
    const allowed = new Set(candidatePermissions.map((p) => p.code))
    setSelectedCodes((prev) => new Set([...prev].filter((c) => allowed.has(c))))
  }, [candidatePermissions])

  const toggleCode = (code: string) => {
    if (ROLE_FORBIDDEN_PERMISSIONS.includes(code)) return
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  const handleSave = () => {
    const permissions = [...selectedCodes]

    if (isCreateMode) {
      const result = createRoleSchema.safeParse({
        code,
        name,
        description: description || undefined,
        type: roleType,
        tenant,
        permissions,
        user: {
          firstName: userFirstName,
          lastName: userLastName || undefined,
          email: userEmail,
          password: userPassword,
          phone: userPhone || undefined,
          gender: userGender || undefined,
        },
      })
      if (!result.success) {
        setFormError(formatZodIssue(result.error.issues[0]))
        return
      }
      setFormError(null)
      createRole.mutate(result.data, {
        onSuccess: (res) => {
          if (res.data?.id) {
            navigate(ROLE_ROUTES.ROLE_DETAIL.replace(':id', res.data.id))
          }
        },
      })
      return
    }

    const result = updateRoleSchema.safeParse({
      name,
      description: description || undefined,
      status: status || undefined,
      type: roleType || undefined,
      permissions,
      user: {
        firstName: userFirstName || undefined,
        lastName: userLastName || undefined,
        status: userStatus || undefined,
        gender: userGender || undefined,
      },
    })
    if (!result.success) {
      setFormError(formatZodIssue(result.error.issues[0]))
      return
    }
    setFormError(null)
    updateRole.mutate(result.data)
  }

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
        <>
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
                    Tenant
                  </Label>
                  <Select
                    value={tenant || undefined}
                    onValueChange={(v) => {
                      setTenant(v ?? '')
                      setRoleType('')
                    }}
                  >
                    <SelectTrigger id="tenant" className="w-full">
                      <SelectValue placeholder="Select tenant">
                        {(v) => {
                          const t = tenants.find((t) => t.id === v)
                          return t ? `${t.name} (${t.code})` : 'Select tenant'
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
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                    The role type and elevated permissions below are scoped to this tenant.
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
                  <Input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. site-manager-john"
                  />
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
                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <Label
                  htmlFor="description"
                  className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                  style={{ color: 'var(--qms-text-muted)' }}
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label
                  htmlFor="roleType"
                  className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                  style={{ color: 'var(--qms-text-muted)' }}
                >
                  Role Type
                </Label>
                <Select value={roleType || undefined} onValueChange={(v) => setRoleType(v ?? '')} disabled={!tenant}>
                  <SelectTrigger id="roleType" className="w-full">
                    <SelectValue placeholder={tenant ? 'Select role type' : 'Select a tenant first'}>
                      {(v) => {
                        const rt = roleTypes.find((rt) => rt.id === v)
                        return rt ? `${rt.name} (${rt.code})` : tenant ? 'Select role type' : 'Select a tenant first'
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roleTypes.map((rt) => (
                      <SelectItem key={rt.id} value={rt.id}>
                        {rt.name} ({rt.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                  Scoped to the same tenant this role belongs to.
                </p>
              </div>

              {!isCreateMode && (
                <div>
                  <Label
                    htmlFor="status"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Status
                  </Label>
                  <Select value={status || undefined} onValueChange={(v) => setStatus(v as RoleStatus)}>
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
                  <Input
                    id="userFirstName"
                    type="text"
                    value={userFirstName}
                    onChange={(e) => setUserFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="userLastName"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Last name
                  </Label>
                  <Input
                    id="userLastName"
                    type="text"
                    value={userLastName}
                    onChange={(e) => setUserLastName(e.target.value)}
                  />
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
                    <Input id="userEmail" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label
                      htmlFor="userPassword"
                      className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                      style={{ color: 'var(--qms-text-muted)' }}
                    >
                      Password
                    </Label>
                    <Input
                      id="userPassword"
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                    />
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
                  <Input
                    id="userPhone"
                    type="text"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="Optional"
                    disabled={!isCreateMode}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="userGender"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Gender
                  </Label>
                  <Select value={userGender || undefined} onValueChange={(v) => setUserGender(v as typeof userGender)}>
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
                  <Select value={userStatus || undefined} onValueChange={(v) => setUserStatus(v as typeof userStatus)}>
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
                {selectedCodes.size} of {candidatePermissions.length} selected
              </span>
            </div>
            <p className="text-[12px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
              Optional, temporary grants layered on top of the bound role type's own permissions (e.g. a same-domain
              grant like <span className="font-mono">sales.manage</span> for this one person) — not a replacement for
              them. Choices are limited to permissions the role type already has AND that this tenant's permission
              group allows.{' '}
              <span className="font-semibold">
                Tenant-admin, tenant-manage, and system-manage can never be granted here.
              </span>
            </p>

            {!tenant && (
              <div className="text-[13px] py-6 text-center rounded-lg border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                Select a tenant above to load available elevated permissions.
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
                This tenant has no permission group configured yet, so no elevated permissions can be assigned.
              </div>
            )}

            {tenant && roleType && !isLoadingCeiling && permissionGroup && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {candidatePermissions.map((permission) => {
                  const checked = selectedCodes.has(permission.code)
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
                    within this tenant's permission group ceiling.
                  </div>
                )}
              </div>
            )}

            {permissionGroupCeilingCodes.size === 0 && permissionGroup && (
              <p className="text-[11px] mt-3" style={{ color: 'var(--qms-text-muted)' }}>
                This tenant's permission group currently grants no permissions.
              </p>
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

            {formError && (
              <div ref={errorRef} className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
                {formError}
              </div>
            )}

            <Button onClick={handleSave} disabled={mutation.isPending} className="mt-4">
              {mutation.isPending ? 'Saving…' : isCreateMode ? 'Create role' : 'Save changes'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default RoleDetailPage
