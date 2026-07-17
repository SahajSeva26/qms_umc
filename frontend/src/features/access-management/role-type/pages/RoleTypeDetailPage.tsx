import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createRoleTypeSchema, updateRoleTypeSchema } from '@/features/access-management/role-type/schemas/roleType.schemas'
import { useScrollIntoViewOnChange } from '@/hooks/useScrollIntoViewOnChange'
import type { RoleTypeCode, RoleTypeStatus } from '@/types/accessManagement.types'

// Combined create-flow + edit page:
//   - no `:id` param (route is ROLE_TYPE_NEW)  -> create form
//   - `:id` param present (route is ROLE_TYPE_DETAIL) -> load + edit form
// Mirrors `@/features/access-management/permission-group/pages/PermissionGroupDetailPage.tsx`'s
// overall shape (back link, header summary card, editable card, save button
// wired to a mutation with isPending/isError/isSuccess feedback) and reuses
// its permission-picker checkbox UI pattern — but CEILING-SCOPED: the pickable
// permissions here are NOT the full 27-code PERMISSION_CATALOG, they are
// exactly whatever permissions the target tenant's OWN PermissionGroup
// contains (fetched via useTenantPermissionGroup, which mirrors backend
// `roleType.service.ts`'s `handlePermissionUpdate` ceiling check:
// `PermissionGroupService.search({ tenant: ctx.tenant._id }).items[0]`).
//
// `code` is a <Select> constrained to the backend's ALLOWED_ROLETYPE_CODES
// enum (roleTypeCodes.ts) on create. The `{tenantCode}.admin` reserved,
// system-seeded pattern is never offered as a creatable option here — if an
// existing RoleType already has that shape (loaded on the edit path), it is
// shown read-only with an explanatory note instead of the (disabled) code
// selector, since `code` is not editable via UpdateRoleTypePayload anyway.
//
// Permissions are sent as bare string codes (CreateRoleTypePayload /
// UpdateRoleTypePayload both type `permissions?: string[]`), unlike
// PermissionGroup's `IPermission[]` — the toggle logic below tracks a
// Set<string> of codes directly.

const RoleTypeDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const isCreateMode = !id
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const { data, isLoading, error } = useRoleType(id)
  const roleType = data?.data ?? null

  const { data: tenantsData } = useTenants({})
  const tenants = tenantsData?.data?.items ?? []

  // On create, the tenant is chosen via a picker (optionally pre-filled from
  // ?tenant=<id> query param); on edit, it comes from the loaded RoleType.
  const [tenant, setTenant] = useState(searchParams.get('tenant') ?? '')
  useEffect(() => {
    if (roleType && !isCreateMode) {
      // roleType.tenant is a raw ObjectId string on GET-by-id but a populated
      // {_id, name, code} object on GET (search) — see RoleTypePopulatedTenant.
      const tenantValue = roleType.tenant
      setTenant(typeof tenantValue === 'string' ? tenantValue : (tenantValue?._id ?? ''))
    }
  }, [roleType, isCreateMode])

  const selectedTenantRecord = tenants.find((t) => t.id === tenant)

  const { permissionGroup, isLoading: isLoadingCeiling } = useTenantPermissionGroup(tenant || undefined)
  const ceilingPermissions = useMemo(() => permissionGroup?.permissions ?? [], [permissionGroup])

  const updateRoleType = useUpdateRoleType(id ?? '')
  const createRoleType = useCreateRoleType()

  const [code, setCode] = useState<RoleTypeCode | ''>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<RoleTypeStatus | ''>('')
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [formError, setFormError] = useState<string | null>(null)
  const errorRef = useScrollIntoViewOnChange<HTMLDivElement>(formError)
  // Permissions dropped from selectedCodes because the tenant's PermissionGroup
  // ceiling has shrunk since this RoleType was last saved (see the pruning
  // effect below) — surfaced as a visible notice rather than silently
  // vanishing from the checked list, since an admin could otherwise revoke a
  // permission from a role type without ever intending to, just by opening
  // and re-saving the page.
  const [prunedCodes, setPrunedCodes] = useState<string[]>([])

  useEffect(() => {
    if (roleType && !isCreateMode) {
      setName(roleType.name)
      setDescription(roleType.description ?? '')
      setStatus(roleType.status ?? '')
      // roleType.permissions is a bare string[] on the wire (see RoleTypeEntity
      // comment in accessManagement.types.ts) — no .code projection needed.
      setSelectedCodes(new Set(roleType.permissions ?? []))
    }
  }, [roleType, isCreateMode])

  // Whenever the ceiling (tenant's PermissionGroup) changes, drop any
  // selected code that has fallen outside it — the ceiling is authoritative
  // and the backend would reject an out-of-ceiling code on save anyway. But
  // don't do this silently: record which codes were actually dropped so a
  // visible notice can tell the admin exactly what's about to be revoked,
  // rather than a permission quietly disappearing from the checked list
  // with no trace before they click Save.
  useEffect(() => {
    if (!permissionGroup) return
    const allowed = new Set(ceilingPermissions.map((p) => p.code))
    setSelectedCodes((prev) => {
      const dropped = [...prev].filter((c) => !allowed.has(c))
      if (dropped.length > 0) setPrunedCodes((existing) => [...new Set([...existing, ...dropped])])
      return new Set([...prev].filter((c) => allowed.has(c)))
    })
  }, [permissionGroup, ceilingPermissions])

  const toggleCode = (code: string) => {
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

  const reservedCode = !isCreateMode && roleType ? isReservedTenantAdminCode(roleType.code, selectedTenantRecord?.code) : false

  const handleSave = () => {
    const permissions = [...selectedCodes]

    if (isCreateMode) {
      const result = createRoleTypeSchema.safeParse({
        code: code || undefined,
        name,
        description: description || undefined,
        tenant,
        permissions,
      })
      if (!result.success) {
        setFormError(result.error.issues[0].message)
        return
      }
      setFormError(null)
      createRoleType.mutate(result.data as Parameters<typeof createRoleType.mutate>[0], {
        onSuccess: (res) => {
          if (res.data?.id) {
            navigate(ROLE_TYPE_ROUTES.ROLE_TYPE_DETAIL.replace(':id', res.data.id))
          }
        },
      })
      return
    }

    const result = updateRoleTypeSchema.safeParse({
      name,
      description: description || undefined,
      status: status || undefined,
      permissions,
    })
    if (!result.success) {
      setFormError(result.error.issues[0].message)
      return
    }
    setFormError(null)
    updateRoleType.mutate(result.data)
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
        <>
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
                  <Label
                    htmlFor="tenant"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Tenant
                  </Label>
                  <Select value={tenant || undefined} onValueChange={(v) => setTenant(v ?? '')}>
                    <SelectTrigger id="tenant" className="w-full">
                      <SelectValue placeholder="Select tenant" />
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
                    The available permissions below are limited to this tenant's own permission group.
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
                  <Label
                    htmlFor="code"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Code
                  </Label>
                  <Select value={code || undefined} onValueChange={(v) => setCode(v as RoleTypeCode)}>
                    <SelectTrigger id="code" className="w-full">
                      <SelectValue placeholder="Select code" />
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
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                    Must be one of the platform's allowed role-type codes.
                  </p>
                </div>
              )}

              {!isCreateMode && reservedCode && (
                <div>
                  <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                    Code
                  </Label>
                  <div className="text-[13px] font-mono rounded-lg border px-3 py-2" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}>
                    {roleType?.code}
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                    This is the reserved, system-seeded tenant-admin role type code and cannot be changed.
                  </p>
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

              {!isCreateMode && (
                <div>
                  <Label
                    htmlFor="status"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Status
                  </Label>
                  <Select value={status || undefined} onValueChange={(v) => setStatus(v as RoleTypeStatus)}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="Select status" />
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
              Only permissions granted to this tenant's own permission group can be assigned to a role type —
              that group is the ceiling for every role type under it.
            </p>

            {prunedCodes.length > 0 && (
              <div className="text-[12px] rounded-xl px-3 py-2 mb-4 bg-warning-soft border border-warning text-warning">
                <span className="font-semibold">Heads up:</span> this tenant's permission group no longer grants{' '}
                {prunedCodes.length === 1 ? 'this permission' : 'these permissions'}, so{' '}
                {prunedCodes.length === 1 ? "it's" : "they're"} no longer selected below:{' '}
                <span className="font-mono">{prunedCodes.join(', ')}</span>. Saving now will remove{' '}
                {prunedCodes.length === 1 ? 'it' : 'them'} from this role type.
              </div>
            )}

            {!tenant && (
              <div className="text-[13px] py-6 text-center rounded-lg border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                Select a tenant above to load its available permissions.
              </div>
            )}

            {tenant && isLoadingCeiling && (
              <div className="text-[13px] py-6 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                Loading available permissions…
              </div>
            )}

            {tenant && !isLoadingCeiling && !permissionGroup && (
              <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                This tenant has no permission group configured yet, so no permissions can be assigned.
              </div>
            )}

            {tenant && !isLoadingCeiling && permissionGroup && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ceilingPermissions.map((permission) => {
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

                {ceilingPermissions.length === 0 && (
                  <div className="text-[13px] py-6 text-center col-span-full" style={{ color: 'var(--qms-text-muted)' }}>
                    This tenant's permission group grants no permissions yet.
                  </div>
                )}
              </div>
            )}

            {mutation.isError && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
                Failed to save changes.
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
              {mutation.isPending ? 'Saving…' : isCreateMode ? 'Create role type' : 'Save changes'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default RoleTypeDetailPage
