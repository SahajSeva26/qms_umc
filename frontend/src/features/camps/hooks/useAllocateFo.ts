import { useMutation, useQueryClient } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'

// Wraps POST /camps/:id/allocate — manual retry of the nearest-free-FO
// auto-assignment. Routes through the backend's update() path internally, so
// it 409s the same way a direct fo edit would once the camp has left
// 'requested'; 422 if the camp has no coordinates or no FO covers the area.
export const useAllocateFo = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => campsRealService.allocateFo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campReal', id] })
      queryClient.invalidateQueries({ queryKey: ['campsReal'] })
    },
  })
}
