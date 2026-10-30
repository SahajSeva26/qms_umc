import { useQuery } from '@tanstack/react-query'
import { inventoryRequestService } from '@/features/inventory/real/inventoryRequest.service'
import { inventoryRequestKeys } from '@/features/inventory/real/hooks/useInventoryRequests'

// staleTime avoids refetching this aggregate on every remount — create/update/moveStage invalidate it anyway.
export const useInventoryRequestReport = (enabled: boolean) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...inventoryRequestKeys.all, 'report'],
    queryFn: () => inventoryRequestService.getInventoryRequestReport(),
    enabled,
    staleTime: 60_000,
  })

  return { report: data?.data, isLoading, error, refetch }
}
