import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Camp } from '@/features/camps/camp.types'
import * as campsService from '@/features/camps/camps.service'

// Shared wrapper over Camps feature data for other features (Dashboard,
// Projects, Ops Manager, etc.) — camp-lifecycle mutations stay in
// features/camps/hooks/useCamps.ts; addCamp/patchCamp here are for other
// features booking/patching without importing features/camps/ internals.
// Split from the mock doctor seed list — see useCampDoctors.ts — since the
// two datasets have different consumers and once shared a colliding query
// key ('doctors' vs 'mockCampDoctors'); see doctorCacheIsolation.test.tsx.
export const useCampsShared = () => {
  const queryClient = useQueryClient()

  const { data: camps = [], isLoading, error } = useQuery({ queryKey: ['camps'], queryFn: campsService.getCamps })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['camps'] })

  const addCampMutation = useMutation({
    mutationFn: (camp: Camp) => campsService.addCamp(camp),
    onSuccess: invalidate,
  })

  const patchCampMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Camp> }) => campsService.patchCamp(id, patch),
    onSuccess: invalidate,
  })

  return {
    camps,
    isLoading,
    error,
    addCamp: (camp: Camp) => addCampMutation.mutateAsync(camp),
    patchCamp: (id: string, patch: Partial<Camp>) => patchCampMutation.mutateAsync({ id, patch }),
  }
}
