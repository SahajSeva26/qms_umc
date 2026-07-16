import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Camp } from '@/types/camp.types'
import * as campsService from '@/features/camps/camps.service'

// Shared wrapper around the Camps feature's data — lets other features
// (Dashboard, Projects, Analytics, CRM/Clients, Ops Manager, Diet Camps)
// read camp records and write fields without importing features/camps/
// internals directly. Mirrors useAuth.ts's role as the sanctioned shared
// surface over features/auth/. Camp-specific mutations (setStatus, assignFo,
// toggleTele) stay in features/camps/hooks/useCamps.ts — only Camps itself
// acts on its own records' lifecycle; addCamp/patchCamp here are for OTHER
// features booking a new camp or patching fields Camps' own hook doesn't
// cover (e.g. Ops Manager's dietitian-rate writes, Diet Camps' cancellation).
export const useCampsData = () => {
  const queryClient = useQueryClient()

  const { data: camps = [], isLoading: campsLoading, error: campsError } = useQuery({ queryKey: ['camps'], queryFn: campsService.getCamps })
  const { data: doctors = [], isLoading: doctorsLoading, error: doctorsError } = useQuery({ queryKey: ['doctors'], queryFn: campsService.getDoctors })

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
