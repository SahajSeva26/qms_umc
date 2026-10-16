import { useQuery } from '@tanstack/react-query'
import { usePermission } from '@/hooks/usePermission'
import { getDashboardData } from '@/features/dashboard/dashboard.service'

const STALE_TIME_MS = 60_000

// Shared wrapper around the Dashboard feature's aggregate data — lets Analytics read it without
// importing features/dashboard/ internals. The key mirrors useDashboardData's own so both share
// one cache entry instead of fetching the same payload twice.
export const useDashboardDataShared = () => {
  const { hasAnyPermission } = usePermission()
  const canViewProjectReport = hasAnyPermission(['project:manage', 'tenant:manage'])
  const canViewLeadReport = hasAnyPermission(['lead:manage'])
  const canViewAppointmentReport = hasAnyPermission(['appointment:manage'])
  const canViewInventoryAssignmentReport = hasAnyPermission(['inventory-assignment:manage'])
  const canViewInvoiceReport = hasAnyPermission(['invoice:search', 'invoice:manage', 'tenant:manage'])
  const canSearchPatients = hasAnyPermission(['patient:search', 'patient:manage'])

  const flags = {
    canViewProjectReport,
    canViewLeadReport,
    canViewAppointmentReport,
    canViewInventoryAssignmentReport,
    canViewInvoiceReport,
    canSearchPatients,
  }

  return useQuery({
    queryKey: ['dashboard', flags],
    queryFn: () => getDashboardData(flags),
    staleTime: STALE_TIME_MS,
  })
}
