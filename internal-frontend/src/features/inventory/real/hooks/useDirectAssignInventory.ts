import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryAssignmentService } from '@/features/inventory/real/inventoryAssignment.service'
import { inventoryAssignmentKeys } from '@/features/inventory/real/hooks/useInventoryAssignments'
import { inventoryDeviceKeys } from '@/features/inventory/real/hooks/useInventoryDevices'
import { inventoryConsumableKeys } from '@/features/inventory/real/hooks/useInventoryConsumables'
import { inventoryLedgerKeys } from '@/features/inventory/real/hooks/useInventoryLedgers'
import type { DirectAssignmentPayload } from '@/types/inventoryAssignment.types'

// Same pattern as useCreateInventoryRequest — this also flips device status, pulls
// consumable lots, and writes a ledger row, so all 4 caches need invalidating.
export const useDirectAssignInventory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ fo, payload }: { fo: string; payload: DirectAssignmentPayload }) =>
      inventoryAssignmentService.directAssign(fo, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryAssignmentKeys.all })
      queryClient.invalidateQueries({ queryKey: inventoryDeviceKeys.all })
      queryClient.invalidateQueries({ queryKey: inventoryConsumableKeys.all })
      queryClient.invalidateQueries({ queryKey: inventoryLedgerKeys.all })
    },
  })
}
