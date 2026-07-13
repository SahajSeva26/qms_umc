import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CampStatus } from '@/types/camp.types'
import * as campsService from '@/features/camps/camps.service'

export const useCamps = () => {
  const queryClient = useQueryClient()

  const { data: camps = [], isLoading, error } = useQuery({ queryKey: ['camps'], queryFn: campsService.getCamps })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['camps'] })

  const setStatusMutation = useMutation({
    mutationFn: ({ id, status, cancelReason }: { id: string; status: CampStatus; cancelReason?: string }) =>
      campsService.setStatus(id, status, cancelReason),
    onSuccess: invalidate,
  })

  const assignFoMutation = useMutation({
    mutationFn: ({ id, foId }: { id: string; foId: string }) => campsService.assignFo(id, foId),
    onSuccess: invalidate,
  })

  const setStatus = (id: string, status: CampStatus, cancelReason?: string) =>
    setStatusMutation.mutate({ id, status, cancelReason })

  const assignFo = (id: string, foId: string) => assignFoMutation.mutate({ id, foId })

  return { camps, isLoading, error, setStatus, assignFo }
}
