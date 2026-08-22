import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { inventoryRequestService } from '@/features/inventory/real/inventoryRequest.service'
import { inventoryRequestKeys } from '@/features/inventory/real/hooks/useInventoryRequests'
import { inventoryAssignmentKeys } from '@/features/inventory/real/hooks/useInventoryAssignments'
import { inventoryDeviceKeys } from '@/features/inventory/real/hooks/useInventoryDevices'
import { inventoryConsumableKeys } from '@/features/inventory/real/hooks/useInventoryConsumables'
import { inventoryLedgerKeys } from '@/features/inventory/real/hooks/useInventoryLedgers'
import type { MoveInventoryRequestStagePayload } from '@/features/inventory/real/inventoryRequest.types'

// A stage move has cross-module side effects (resolveStockMovement on the
// backend): it can change Assignment holdings, Device status, and Consumable
// quantity — not just the request itself. Invalidating only
// inventoryRequestKeys would leave any already-mounted Item/Assignment view
// showing stale data after an approve/receive/reject/cancel.
export const useMoveInventoryRequestStage = (id: string) =>
  useUpdateEntity(
    (payload: MoveInventoryRequestStagePayload) => inventoryRequestService.moveInventoryRequestStage(id, payload),
    [inventoryRequestKeys.all, inventoryAssignmentKeys.all, inventoryDeviceKeys.all, inventoryConsumableKeys.all, inventoryLedgerKeys.all],
  )
