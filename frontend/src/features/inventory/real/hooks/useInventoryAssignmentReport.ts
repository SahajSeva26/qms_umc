import { useQuery } from '@tanstack/react-query'
import { inventoryAssignmentService } from '@/features/inventory/real/inventoryAssignment.service'
import { inventoryAssignmentKeys } from '@/features/inventory/real/hooks/useInventoryAssignments'

// staleTime avoids refetching this manager-only aggregate on every remount —
// useMoveInventoryRequestStage invalidates inventoryAssignmentKeys.all
// (approving/receiving a request changes who holds what), which
// prefix-matches this query's own key too.
export const useInventoryAssignmentReport = (enabled: boolean) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [...inventoryAssignmentKeys.all, 'report'],
    queryFn: () => inventoryAssignmentService.getInventoryAssignmentReport(),
    enabled,
    staleTime: 60_000,
  })

  return { report: data?.data, isLoading, error }
}
