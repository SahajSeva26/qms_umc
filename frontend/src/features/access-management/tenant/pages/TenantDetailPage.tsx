import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useTenant } from '@/features/access-management/tenant/hooks/useTenant'
import { useUpdateTenant } from '@/features/access-management/tenant/hooks/useUpdateTenant'
import { usePermission } from '@/hooks/usePermission'
import { TENANT_ROUTES } from '@/features/access-management/tenant/tenant.routes'
import TenantTypeBadge from '@/features/access-management/tenant/components/TenantTypeBadge'
import TenantStatusPill from '@/features/access-management/tenant/components/TenantStatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateTenantSchema } from '@/features/access-management/tenant/schemas/tenant.schemas'
import type { TenantStatus, TenantType } from '@/types/accessManagement.types'

// Matches `@/features/admin/pages/UserDetailPage.tsx` exactly: back link,
// inline loading/error states, a summary card, then an edit-form card.
//
// Field gating (per backend rule, confirmed in accessManagement.types.ts's
// UpdateTenantPayload comments):
//   - `status` only takes effect server-side if caller has `tenant:manage`
//   - `type`   only takes effect server-side if caller has `system:manage`
// Both fields are hidden (not just disabled) when the caller lacks the
// corresponding permission, since submitting them would be silently ignored
// by the backend anyway — showing an input that does nothing would be
// misleading.
const TenantDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useTenant(id)
  const tenant = data?.data ?? null

  const { hasPermission } = usePermission()
  const canManageTenant = hasPermission('tenant:manage')
  const canManageSystem = hasPermission('system:manage')

  const updateTenant = useUpdateTenant(id ?? '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TenantStatus | ''>('')
  const [type, setType] = useState<TenantType | ''>('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (tenant) {
      setName(tenant.name)
      // NOTE: `Tenant` (the GET response shape) does not expose `description`
      // today — only Create/UpdateTenantPayload accept it. The edit field
      // below is a write-only field: it starts blank and, if left blank, is
      // simply omitted from the update payload rather than clobbering
      // whatever description may exist server-side.
      setStatus(tenant.status ?? '')
      setType(tenant.type ?? '')
    }
  }, [tenant])

  const handleSave = () => {
    const payload: Record<string, unknown> = { name, description: description || undefined }
    if (canManageTenant && status) payload.status = status
    if (canManageSystem && type) payload.type = type

    const result = updateTenantSchema.safeParse(payload)
    if (!result.success) {
      setFormError(result.error.issues[0].message)
      return
    }
    setFormError(null)
    updateTenant.mutate(result.data)
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(TENANT_ROUTES.TENANTS)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to tenants
      </button>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading tenant…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load tenant. Please try again.
        </div>
      )}

      {tenant && !isLoading && (
        <>
          <div
            className="rounded-xl border p-5 mb-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
              {tenant.name}
            </div>
            <div className="text-[13px] truncate mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              {tenant.code}
            </div>
            <div className="flex items-center gap-2">
              <TenantTypeBadge type={tenant.type} />
              <TenantStatusPill status={tenant.status} />
            </div>
          </div>

          <div
            className="rounded-xl border p-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>
              Edit tenant
            </h2>

            <div className="space-y-4">
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
                  placeholder="Leave blank to keep unchanged (not returned by GET, so it can't be pre-filled)"
                />
              </div>

              {canManageTenant && (
                <div>
                  <Label
                    htmlFor="status"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Status
                  </Label>
                  <Select value={status || undefined} onValueChange={(v) => setStatus(v as TenantStatus)}>
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

              {canManageSystem && (
                <div>
                  <Label
                    htmlFor="type"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Type
                  </Label>
                  <Select value={type || undefined} onValueChange={(v) => setType(v as TenantType)}>
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform">Platform</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!canManageTenant && !canManageSystem && (
                <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                  Status and type are only editable by users with tenant or system management permissions.
                </p>
              )}

              {updateTenant.isError && (
                <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                  Failed to save changes.
                </div>
              )}
              {updateTenant.isSuccess && (
                <div className="text-xs rounded-xl px-3 py-2 bg-success-soft text-success">Saved.</div>
              )}

              {formError && <div className="text-xs text-danger">{formError}</div>}

              <Button onClick={handleSave} disabled={updateTenant.isPending}>
                {updateTenant.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default TenantDetailPage
