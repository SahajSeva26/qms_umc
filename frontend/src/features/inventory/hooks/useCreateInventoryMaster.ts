import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryMasterService } from '@/features/inventory/inventoryMaster.service'
import type { CreateInventoryMasterPayload } from '@/types/inventoryMaster.types'

export const useCreateInventoryMaster = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateInventoryMasterPayload) => inventoryMasterService.createInventoryMaster(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-masters'] })
    },
  })
}
