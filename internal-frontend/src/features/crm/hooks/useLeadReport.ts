import { useQuery } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'
import type { LeadReportQuery } from '@/types/crm.types'

// staleTime avoids refetching this rate-limited aggregate on remount (mutations still force one via
// useLeads.ts). retry:false so a failure is one call + the manual Retry action, never a silent second.
export const useLeadReport = (query: LeadReportQuery, enabled: boolean) => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['leads', 'report', query],
    queryFn: () => crmService.getLeadReport(query),
    enabled,
    staleTime: 60_000,
    retry: false,
  })

  return { report: data?.data, isLoading, isError, error, refetch }
}
