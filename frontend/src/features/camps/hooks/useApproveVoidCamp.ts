import { useMutation, useQueryClient } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campRealKeys } from '@/features/camps/hooks/useCampsReal'
import type { ApproveVoidCampPayload } from '@/types/campReal.types'

// The only update a void camp allows — moves it requested -> closed. Route-gated to camp:manage
// OR tenant:manage (see camp.routes.ts's approve-void guard).
export const useApproveVoidCamp = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ApproveVoidCampPayload) => campsRealService.approveVoidCamp(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campRealKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: campRealKeys.all })
    },
  })
}
