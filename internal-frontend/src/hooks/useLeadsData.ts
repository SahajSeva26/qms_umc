import { useQuery } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'

// Read-only shared wrapper around leads data for Analytics/Sales-dashboard —
// lets those features read leads without importing features/crm/ internals
// directly. Mirrors useAuth.ts's role as the sanctioned shared surface.
//
// Wraps the same real crmService.searchLeads() call as features/crm's own
// useLeads() (see hooks/useLeads.ts), but stays read-only (no mutations) per
// this hook's stated purpose — callers needing to move/create/update leads
// should use features/crm/hooks/useLeads.ts directly, not this hook.
export const useLeadsData = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', {}],
    queryFn: () => crmService.searchLeads({}),
  })

  return {
    leads: data?.data?.items ?? [],
    isLoading,
    error,
  }
}
