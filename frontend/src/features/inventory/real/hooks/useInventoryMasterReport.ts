import { useQuery } from '@tanstack/react-query'
import { inventoryMasterService } from '@/features/inventory/real/inventoryMaster.service'
import { inventoryMasterKeys } from '@/features/inventory/real/hooks/useInventoryMasters'

// staleTime avoids refetching this manager-only aggregate on every remount —
// writes to inventory-masters invalidate inventoryMasterKeys.all, which
// prefix-matches this query's own key too.
export const useInventoryMasterReport = (enabled: boolean) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [...inventoryMasterKeys.all, 'report'],
    queryFn: () => inventoryMasterService.getInventoryMasterReport(),
    enabled,
    staleTime: 60_000,
  })

  return { report: data?.data, isLoading, error }
}
