import { useEffect, useState } from 'react'
import type { Tenant, TenantStatus, TenantType } from '@/types/accessManagement.types'
import { useUpdateTenant } from '@/features/access-management/tenant/hooks/useUpdateTenant'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { updateTenantSchema } from '@/features/access-management/tenant/schemas/tenant.schemas'
import { PLATFORM_TENANT_CODE, PLATFORM_TENANT_FETCH_LIMIT } from '@/features/access-management/accessManagement.constants'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface EditTenantModalProps {
  tenant: Tenant
  canManageTenant: boolean
  canManageSystem: boolean
  onClose: () => void
}

// Fields hidden (not disabled) when the caller lacks the permission that
// would make them take effect server-side: `status` needs tenant:manage,
// `type`/`salesPerson` need system:manage.
const EditTenantModal = ({ tenant, canManageTenant, canManageSystem, onClose }: EditTenantModalProps) => {
  const updateTenant = useUpdateTenant(tenant.id)
  const [name, setName] = useState(tenant.name)
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TenantStatus | ''>(tenant.status ?? '')
  const [type, setType] = useState<TenantType | ''>(tenant.type ?? '')
  const [salesPerson, setSalesPerson] = useState(tenant.salesPerson ?? '')
  const [formError, setFormError] = useState<string | null>(null)

  // Same sales-rep picker as CreateTenantDialog.tsx.
  const { data: platformTenantData } = useTenants({ type: 'platform', status: 'active', limit: PLATFORM_TENANT_FETCH_LIMIT }, canManageSystem)
  const platformTenant = platformTenantData?.data?.items.find((t) => t.type === 'platform' || t.code === PLATFORM_TENANT_CODE)
  const { data: salesRepTypeData, isLoading: roleTypeLoading } = useRoleTypes({ code: 'sales-rep', status: 'active' }, canManageSystem)
  const salesRepTypeId = salesRepTypeData?.data?.items[0]?.id
  const { data: salesRepRoleData, isLoading: salesRepsLoading } = useRoles(
    { tenant: platformTenant?.id, type: salesRepTypeId, status: 'active' },
    canManageSystem && !!platformTenant && !!salesRepTypeId,
  )
  const salesReps = salesRepRoleData?.data?.items ?? []
  const salesRepsBusy = roleTypeLoading || salesRepsLoading

  useEffect(() => {
    if (updateTenant.isSuccess) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateTenant.isSuccess])

  const handleSave = () => {
    const payload: Record<string, unknown> = { name, description: description || undefined }
    if (canManageTenant && status) payload.status = status
    if (canManageSystem && type) payload.type = type
    if (canManageSystem) payload.salesPerson = salesPerson || null

    const result = updateTenantSchema.safeParse(payload)
    if (!result.success) {
      setFormError(result.error.issues[0].message)
      return
    }
    setFormError(null)
    updateTenant.mutate(result.data)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Edit company</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Name
            </Label>
            <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="description" className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
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
              <Label htmlFor="status" className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </Label>
              <Select key={status || 'empty'} value={status || undefined} onValueChange={(v) => setStatus(v as TenantStatus)}>
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

          {canManageSystem && (
            <div>
              <Label htmlFor="type" className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Type
              </Label>
              <Select key={type || 'empty'} value={type || undefined} onValueChange={(v) => setType(v as TenantType)}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="Select type">
                    {(v) => (v === 'platform' ? 'Platform' : v === 'customer' ? 'Customer' : 'Select type')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">Platform</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {canManageSystem && (
            <div>
              <Label htmlFor="salesPerson" className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Sales rep
              </Label>
              <Select key={salesPerson || 'empty'} value={salesPerson || undefined} onValueChange={(v) => setSalesPerson((v as string) ?? '')}>
                <SelectTrigger id="salesPerson" className="w-full">
                  <SelectValue placeholder={salesRepsBusy ? 'Loading...' : 'Select sales rep...'}>
                    {(v: string) => {
                      const r = salesReps.find((role) => role.id === v)
                      return r ? `${r.name} (${r.code})` : salesRepsBusy ? 'Loading...' : 'Select sales rep...'
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {salesReps.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
                </SelectContent>
              </Select>
              {salesPerson && (
                <button
                  type="button"
                  onClick={() => setSalesPerson('')}
                  className="text-[11px] mt-1 underline"
                  style={{ color: 'var(--qms-text-muted)' }}
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {!canManageTenant && !canManageSystem && (
            <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
              Status and type are only editable by users with company or system management permissions.
            </p>
          )}

          {updateTenant.isError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              {(updateTenant.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to save changes.'}
            </div>
          )}

          {formError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateTenant.isPending}>
              {updateTenant.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EditTenantModal
