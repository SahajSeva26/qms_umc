import { useQuery } from '@tanstack/react-query'
import { inventoryDeviceService } from '@/features/inventory/real/inventoryDevice.service'
import { inventoryDeviceKeys } from '@/features/inventory/real/hooks/useInventoryDevices'

// staleTime avoids refetching this manager-only aggregate on every remount —
// writes to inventory-devices invalidate inventoryDeviceKeys.all, which
// prefix-matches this query's own key too.
export const useInventoryDeviceReport = (enabled: boolean) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [...inventoryDeviceKeys.all, 'report'],
    queryFn: () => inventoryDeviceService.getInventoryDeviceReport(),
    enabled,
    staleTime: 60_000,
  })

  return { report: data?.data, isLoading, error }
}
