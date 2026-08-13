import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryMasterService } from '@/features/inventory/inventoryMaster.service'
import type { UpdateInventoryMasterPayload } from '@/types/inventoryMaster.types'

export const useUpdateInventoryMaster = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateInventoryMasterPayload) => inventoryMasterService.updateInventoryMaster(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-masters'] })
    },
  })
}
