import { useQuery } from '@tanstack/react-query'
import { inventoryMasterKeys } from '@/features/inventory/real/hooks/useInventoryMasters'
import { inventoryMasterService } from '@/features/inventory/real/inventoryMaster.service'

// Catalog reads are open to every authenticated user. Keep the singular lookup
// behind an enabled gate so opening a lot with a missing/legacy item reference
// never sends a malformed request.
export const useInventoryMaster = (id: string | undefined, enabled = true) =>
  useQuery({
    queryKey: inventoryMasterKeys.detail(id ?? ''),
    queryFn: () => inventoryMasterService.getInventoryMaster(id!),
    enabled: enabled && !!id,
  })
