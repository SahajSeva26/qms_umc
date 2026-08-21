import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDivisions } from '@/features/crm/divisions/hooks/useDivisions'
import { useDoctors } from '@/features/doctors/hooks/useDoctors'

export const useCampPickerData = (tenant: string, isCreateMode: boolean) => {
  // Edit mode shows a read-only summary instead; tenant/division are immutable post-create.
  const { data: tenantsData } = useTenants({ limit: '20' }, isCreateMode)
  const tenants = tenantsData?.data?.items ?? []

  // An omitted/empty tenant means "no filter at all" server-side.
  const { data: divisionsData } = useDivisions(
    { tenant: tenant || undefined, limit: '200' },
    !!tenant,
  )
  const divisions = divisionsData?.data?.items ?? []

  const { data: doctorsData } = useDoctors({ limit: '10' })
  const doctors = doctorsData?.data?.items ?? []

  return { tenants, divisions, doctors }
}
