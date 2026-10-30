import { useQuery } from '@tanstack/react-query'
import { inventoryDeviceService } from '@/features/inventory/real/inventoryDevice.service'
import { inventoryDeviceKeys } from '@/features/inventory/real/hooks/useInventoryDevices'

// staleTime avoids refetching this aggregate on every remount — writes to inventory-devices invalidate it anyway.
export const useInventoryDeviceReport = (enabled: boolean) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...inventoryDeviceKeys.all, 'report'],
    queryFn: () => inventoryDeviceService.getInventoryDeviceReport(),
    enabled,
    staleTime: 60_000,
  })

  return { report: data?.data, isLoading, error, refetch }
}
