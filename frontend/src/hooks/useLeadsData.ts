import { useQuery } from '@tanstack/react-query'
import * as crmService from '@/features/crm/crm.service'

// Read-only shared wrapper around CRM's leads data — lets other features
// (Analytics) read leads without importing features/crm/ internals directly.
// Mirrors useAuth.ts's role as the sanctioned shared surface over
// features/auth/. Mutations (moveStage, markLost, reopen, createLead) stay
// in features/crm/hooks/useLeads.ts — only CRM itself acts on leads.
export const useLeadsData = () => {
  const { data: leads = [], isLoading, error } = useQuery({ queryKey: ['leads'], queryFn: crmService.getLeads })
  return { leads, isLoading, error }
}
