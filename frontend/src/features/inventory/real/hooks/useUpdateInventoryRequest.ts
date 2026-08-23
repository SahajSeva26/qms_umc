import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { inventoryRequestService } from '@/features/inventory/real/inventoryRequest.service'
import { inventoryRequestKeys } from '@/features/inventory/real/hooks/useInventoryRequests'
import type { UpdateInventoryRequestPayload } from '@/features/inventory/real/inventoryRequest.types'

export const useUpdateInventoryRequest = (id: string) =>
  useUpdateEntity(
    (payload: UpdateInventoryRequestPayload) => inventoryRequestService.updateInventoryRequest(id, payload),
    [inventoryRequestKeys.all],
  )
