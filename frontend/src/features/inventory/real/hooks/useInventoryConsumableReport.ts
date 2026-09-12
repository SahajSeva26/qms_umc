import { useQuery } from '@tanstack/react-query'
import { inventoryConsumableService } from '@/features/inventory/real/inventoryConsumable.service'
import { inventoryConsumableKeys } from '@/features/inventory/real/hooks/useInventoryConsumables'

// staleTime avoids refetching this manager-only aggregate on every remount —
// writes to inventory-consumables invalidate inventoryConsumableKeys.all,
// which prefix-matches this query's own key too.
export const useInventoryConsumableReport = (enabled: boolean) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [...inventoryConsumableKeys.all, 'report'],
    queryFn: () => inventoryConsumableService.getInventoryConsumableReport(),
    enabled,
    staleTime: 60_000,
  })

  return { report: data?.data, isLoading, error }
}
