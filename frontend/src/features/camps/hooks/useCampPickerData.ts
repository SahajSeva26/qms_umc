import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDoctors } from '@/features/doctors/hooks/useDoctors'

// `tenant` is create mode's picked Company, or edit mode's loaded camp.tenant
// (the caller resolves which — see CampDetailPageReal.tsx's effectiveTenant)
// — doctors are always scoped to it, never fetched unscoped.
export const useCampPickerData = (isCreateMode: boolean, tenant: string) => {
  // Edit mode shows a read-only summary instead; tenant is immutable post-create.
  // UI choice, not a backend rule: only customer tenants are offered here so
  // staff don't accidentally create a camp against the platform tenant.
  const { data: tenantsData } = useTenants({ limit: '20', type: 'customer' }, isCreateMode)
  const tenants = tenantsData?.data?.items ?? []

  const { data: doctorsData } = useDoctors({ limit: '10', tenant: tenant || undefined }, { enabled: !!tenant })
  const doctors = doctorsData?.data?.items ?? []

  return { tenants, doctors }
}
