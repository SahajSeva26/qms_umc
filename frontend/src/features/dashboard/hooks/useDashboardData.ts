import { useQuery } from '@tanstack/react-query'
import { usePermission } from '@/hooks/usePermission'
import { getDashboardData } from '@/features/dashboard/dashboard.service'

const STALE_TIME_MS = 60_000

// Every consumer calls this with no arguments, so TanStack Query collapses them into one fetch
// under one cache key — don't "optimise" by lifting the data into DashboardPage and prop-drilling.
export const useDashboardData = () => {
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
