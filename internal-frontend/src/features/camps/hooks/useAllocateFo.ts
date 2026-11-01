import { useMutation, useQueryClient } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campRealKeys } from '@/features/camps/hooks/useCampsReal'

// Manual retry of the nearest-free-FO auto-assignment; 409s once the camp has
// left 'requested', 422 if the camp has no coordinates or no FO covers the area.
export const useAllocateFo = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => campsRealService.allocateFo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campRealKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: campRealKeys.all })
    },
  })
}
