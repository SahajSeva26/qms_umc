import { useQuery } from '@tanstack/react-query'
import { inventoryConsumableService } from '@/features/inventory/real/inventoryConsumable.service'
import { inventoryConsumableKeys } from '@/features/inventory/real/hooks/useInventoryConsumables'

// staleTime avoids refetching this aggregate on every remount — writes to inventory-consumables invalidate it anyway.
export const useInventoryConsumableReport = (enabled: boolean) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...inventoryConsumableKeys.all, 'report'],
    queryFn: () => inventoryConsumableService.getInventoryConsumableReport(),
    enabled,
    staleTime: 60_000,
  })

  return { report: data?.data, isLoading, error, refetch }
}
