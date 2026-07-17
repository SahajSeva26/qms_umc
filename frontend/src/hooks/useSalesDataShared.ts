import { useQuery } from '@tanstack/react-query'
import * as salesService from '@/features/crm/sales/sales.service'

// Read-only shared wrapper around CRM Sales' data — lets other features
// (Dashboard, Analytics) read reps/targets/approvals without importing
// features/crm/sales/ internals directly. Mirrors useAuth.ts's role as the
// sanctioned shared surface over features/auth/. Mutations (addRep,
// setTarget, approve/reject/withdraw/submit) stay in
// features/crm/sales/hooks/useSalesData.ts — only CRM Sales itself acts on
// this data.
export const useSalesDataShared = () => {
  const { data, isLoading, error } = useQuery({ queryKey: ['sales-data'], queryFn: salesService.getSalesData })

  return {
    reps: data?.reps ?? [],
    targets: data?.targets ?? [],
    assignments: data?.assignments ?? [],
    approvals: data?.approvals ?? [],
    activityFeed: data?.activityFeed ?? [],
    meetings: data?.meetings ?? [],
    isLoading,
    error,
  }
}
