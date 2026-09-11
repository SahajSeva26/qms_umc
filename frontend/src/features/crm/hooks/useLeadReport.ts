import { useQuery } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'
import type { LeadReportQuery } from '@/types/crm.types'

// staleTime avoids refetching this rate-limited aggregate on every remount;
// useLeads.ts's invalidateQueries(['leads']) still forces a refetch on mutation.
export const useLeadReport = (query: LeadReportQuery, enabled: boolean) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', 'report', query],
    queryFn: () => crmService.getLeadReport(query),
    enabled,
    staleTime: 60_000,
  })

  return { report: data?.data, isLoading, error }
}
