import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDoctors } from '@/features/doctors/hooks/useDoctors'

export const useCampPickerData = (isCreateMode: boolean) => {
  // Edit mode shows a read-only summary instead; tenant is immutable post-create.
  // UI choice, not a backend rule: only customer tenants are offered here so
  // staff don't accidentally create a camp against the platform tenant.
  const { data: tenantsData } = useTenants({ limit: '20', type: 'customer' }, isCreateMode)
  const tenants = tenantsData?.data?.items ?? []

  const { data: doctorsData } = useDoctors({ limit: '10' })
  const doctors = doctorsData?.data?.items ?? []

  return { tenants, doctors }
}
