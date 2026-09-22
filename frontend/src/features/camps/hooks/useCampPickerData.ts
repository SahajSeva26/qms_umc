import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'

// `isCreateMode` gates the fetch — edit mode's camp.tenant is already known, no picker needed.
export const useCampPickerData = (isCreateMode: boolean) => {
  // UI choice, not a backend rule: only customer tenants are offered here so
  // staff don't accidentally create a camp against the platform tenant.
  const { data: tenantsData } = useTenants({ limit: '20', type: 'customer' }, isCreateMode)
  const tenants = tenantsData?.data?.items ?? []

  return { tenants }
}
