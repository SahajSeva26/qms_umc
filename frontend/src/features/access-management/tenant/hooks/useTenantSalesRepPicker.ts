import { useState } from 'react'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { PLATFORM_TENANT_CODE, PLATFORM_TENANT_FETCH_LIMIT } from '@/features/access-management/accessManagement.constants'

// Called once from the coordinator, not TenantBasicsStep — that step unmounts on Next/Back, which
// would reset pickerOpened (and re-disable the queries) every time the user returns to step 0.
export function useTenantSalesRepPicker(enabled: boolean) {
  // Queries only fire once the dropdown has been opened, not just whenever the dialog is open.
  const [pickerOpened, setPickerOpened] = useState(false)
  const queriesEnabled = enabled && pickerOpened

  const { data: platformTenantData, isError: platformTenantErrored } = useTenants({ type: 'platform', status: 'active', limit: PLATFORM_TENANT_FETCH_LIMIT }, queriesEnabled)
  const platformTenant = platformTenantData?.data?.items.find((t) => t.type === 'platform' || t.code === PLATFORM_TENANT_CODE)

  const { data: salesRepTypeData, isLoading: roleTypeLoading, isError: roleTypeErrored } = useRoleTypes({ code: 'sales-rep', status: 'active' }, queriesEnabled)
  const salesRepTypeId = salesRepTypeData?.data?.items[0]?.id

  const { data: salesRepRoleData, isLoading: salesRepsLoading, isError: salesRepsErrored } = useRoles(
    { tenant: platformTenant?.id, type: salesRepTypeId, status: 'active' },
    queriesEnabled && !!platformTenant && !!salesRepTypeId,
  )
  const salesReps = salesRepRoleData?.data?.items ?? []
  const salesRepsBusy = roleTypeLoading || salesRepsLoading
  const salesRepsErroredOut = platformTenantErrored || roleTypeErrored || salesRepsErrored

  return { pickerOpened, setPickerOpened, platformTenant, salesReps, salesRepsBusy, salesRepsErroredOut }
}
