import { useQuery } from '@tanstack/react-query'
import { inventoryRequestService } from '@/features/inventory/real/inventoryRequest.service'
import { inventoryRequestKeys } from '@/features/inventory/real/hooks/useInventoryRequests'

// staleTime avoids refetching this manager-only aggregate on every remount —
// create/update/moveStage all invalidate inventoryRequestKeys.all, which
// prefix-matches this query's own key too.
export const useInventoryRequestReport = (enabled: boolean) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [...inventoryRequestKeys.all, 'report'],
    queryFn: () => inventoryRequestService.getInventoryRequestReport(),
    enabled,
    staleTime: 60_000,
  })

  return { report: data?.data, isLoading, error }
}
