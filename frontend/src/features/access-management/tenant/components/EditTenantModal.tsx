import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { Tenant, TenantStatus, TenantType, UpdateTenantPayload } from '@/types/accessManagement.types'
import { useUpdateTenant } from '@/features/access-management/tenant/hooks/useUpdateTenant'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useReshapingResolver } from '@/hooks/useReshapingResolver'
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

interface EditTenantFormValues {
  name: string
  description: string
  status: TenantStatus | ''
  type: TenantType | ''
  salesPerson: string
}

// '' must be normalized to undefined — status/type are bare enums with no '' member.
const useEditTenantFormResolver = () =>
  useReshapingResolver<EditTenantFormValues, UpdateTenantPayload>({
    schema: updateTenantSchema,
    toPayload: (values) => ({
      name: values.name,
      description: values.description || undefined,
      status: values.status || undefined,
      type: values.type || undefined,
      salesPerson: values.salesPerson || undefined,
    }),
  })

const EditTenantModal = ({ tenant, canManageTenant, canManageSystem, onClose }: EditTenantModalProps) => {
  const updateTenant = useUpdateTenant(tenant.id)
  const { resolver, parsePayload } = useEditTenantFormResolver()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<EditTenantFormValues>({
    resolver,
    mode: 'onChange',
    defaultValues: {
      name: tenant.name,
      description: '',
      status: tenant.status ?? '',
      type: tenant.type ?? '',
      salesPerson: tenant.salesPerson ?? '',
    },
  })

  const [salesRepPickerOpened, setSalesRepPickerOpened] = useState(false)
  // Loads eagerly if a sales rep is already assigned, so the trigger shows that rep's name right away.
  const salesRepQueriesEnabled = canManageSystem && (salesRepPickerOpened || !!tenant.salesPerson)

  const { data: platformTenantData } = useTenants({ type: 'platform', status: 'active', limit: PLATFORM_TENANT_FETCH_LIMIT }, salesRepQueriesEnabled)
  const platformTenant = platformTenantData?.data?.items.find((t) => t.type === 'platform' || t.code === PLATFORM_TENANT_CODE)
  const { data: salesRepTypeData, isLoading: roleTypeLoading } = useRoleTypes({ code: 'sales-rep', status: 'active' }, salesRepQueriesEnabled)
  const salesRepTypeId = salesRepTypeData?.data?.items[0]?.id
  const { data: salesRepRoleData, isLoading: salesRepsLoading } = useRoles(
    { tenant: platformTenant?.id, type: salesRepTypeId, status: 'active' },
    salesRepQueriesEnabled && !!platformTenant && !!salesRepTypeId,
  )
  const salesReps = salesRepRoleData?.data?.items ?? []
  const salesRepsBusy = roleTypeLoading || salesRepsLoading

  useEffect(() => {
    if (updateTenant.isSuccess) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateTenant.isSuccess])

  const fieldError = (field: keyof EditTenantFormValues) =>
    (touchedFields[field] || isSubmitted) ? errors[field]?.message : undefined

  const onSubmit = async (values: EditTenantFormValues) => {
    const parsed = await parsePayload(values)
    const payload: UpdateTenantPayload = { name: parsed.name, description: parsed.description }
    if (canManageTenant && parsed.status) payload.status = parsed.status
    if (canManageSystem && parsed.type) payload.type = parsed.type
    if (canManageSystem) payload.salesPerson = values.salesPerson || null
    updateTenant.mutate(payload)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Edit company</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Name
            </Label>
            <Input id="name" type="text" {...register('name')} />
            {fieldError('name') && <p className="text-[11px] mt-1 text-danger">{fieldError('name')}</p>}
          </div>

          <div>
            <Label htmlFor="description" className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Leave blank to keep unchanged (not returned by GET, so it can't be pre-filled)"
              {...register('description')}
            />
          </div>

          {canManageTenant && (
            <div>
              <Label htmlFor="status" className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
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

          {canManageSystem && (
            <div>
              <Label htmlFor="type" className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Type
              </Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select key={field.value || 'empty'} value={field.value || undefined} onValueChange={field.onChange}>
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
                )}
              />
            </div>
          )}

          {canManageSystem && (
            <div>
              <Label htmlFor="salesPerson" className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Sales rep
              </Label>
              <Controller
                control={control}
                name="salesPerson"
                render={({ field }) => (
                  <>
                    <Select
                      key={field.value || 'empty'}
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      onOpenChange={(next) => next && setSalesRepPickerOpened(true)}
                    >
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
                    {field.value && (
                      <button
                        type="button"
                        onClick={() => field.onChange('')}
                        className="text-[11px] mt-1 underline"
                        style={{ color: 'var(--qms-text-muted)' }}
                      >
                        Clear
                      </button>
                    )}
                  </>
                )}
              />
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updateTenant.isPending}>
              {updateTenant.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditTenantModal
