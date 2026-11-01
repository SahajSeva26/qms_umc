import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Camp } from '@/types/camp.types'
import * as campsService from '@/features/camps/camps.service'

// Shared wrapper over Camps feature data for other features (Dashboard,
// Projects, Ops Manager, etc.) — camp-lifecycle mutations stay in
// features/camps/hooks/useCamps.ts; addCamp/patchCamp here are for other
// features booking/patching without importing features/camps/ internals.
export const useCampsData = () => {
  const queryClient = useQueryClient()

  const { data: camps = [], isLoading: campsLoading, error: campsError } = useQuery({ queryKey: ['camps'], queryFn: campsService.getCamps })
  // 'mockCampDoctors', not 'doctors' — the real Doctor entity (features/doctors)
  // owns the plain 'doctors' key; a shared key would cross-invalidate both.
  const { data: doctors = [], isLoading: doctorsLoading, error: doctorsError } = useQuery({ queryKey: ['mockCampDoctors'], queryFn: campsService.getDoctors })

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
    doctors,
    isLoading: campsLoading || doctorsLoading,
    error: campsError || doctorsError,
    addCamp: (camp: Camp) => addCampMutation.mutateAsync(camp),
    patchCamp: (id: string, patch: Partial<Camp>) => patchCampMutation.mutateAsync({ id, patch }),
  }
}
