import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryRequestService } from '@/features/inventory/real/inventoryRequest.service'
import { inventoryRequestKeys } from '@/features/inventory/real/hooks/useInventoryRequests'
import { inventoryAssignmentKeys } from '@/features/inventory/real/hooks/useInventoryAssignments'
import { inventoryDeviceKeys } from '@/features/inventory/real/hooks/useInventoryDevices'
import { inventoryConsumableKeys } from '@/features/inventory/real/hooks/useInventoryConsumables'
import { inventoryLedgerKeys } from '@/features/inventory/real/hooks/useInventoryLedgers'
import type { CreateInventoryRequestPayload } from '@/features/inventory/real/inventoryRequest.types'

// Not useCreateEntity (single-key only) — a fresh 'return' request withdraws
// stock immediately on create() (resolveStockMovement runs at 'requested' for
// a return, unlike a refill which has no side effect until approved), so
// Assignment/Device/Consumable caches need invalidating here too, same as
// useMoveInventoryRequestStage.
export const useCreateInventoryRequest = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateInventoryRequestPayload) => inventoryRequestService.createInventoryRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryRequestKeys.all })
      queryClient.invalidateQueries({ queryKey: inventoryAssignmentKeys.all })
      queryClient.invalidateQueries({ queryKey: inventoryDeviceKeys.all })
      queryClient.invalidateQueries({ queryKey: inventoryConsumableKeys.all })
      queryClient.invalidateQueries({ queryKey: inventoryLedgerKeys.all })
    },
  })
}
