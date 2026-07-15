import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Camp } from '@/types/camp.types'
import * as campsService from '@/features/camps/camps.service'

// Shared wrapper around the Camps feature's data — lets other features
// (Dashboard, Projects, Analytics, CRM/Clients) read camp records and add
// externally-booked camps without importing features/camps/ internals
// directly. Mirrors useAuth.ts's role as the sanctioned shared surface over
// features/auth/. Camp-specific mutations (setStatus, assignFo) stay in
// features/camps/hooks/useCamps.ts — only Camps itself acts on its own
// records' lifecycle; addCamp here is for OTHER features booking a new one.
export const useCampsData = () => {
  const queryClient = useQueryClient()

  const { data: camps = [], isLoading: campsLoading, error: campsError } = useQuery({ queryKey: ['camps'], queryFn: campsService.getCamps })
  const { data: doctors = [], isLoading: doctorsLoading, error: doctorsError } = useQuery({ queryKey: ['doctors'], queryFn: campsService.getDoctors })

  const addCampMutation = useMutation({
    mutationFn: (camp: Camp) => campsService.addCamp(camp),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['camps'] }),
  })

  return {
    camps,
    doctors,
    isLoading: campsLoading || doctorsLoading,
    error: campsError || doctorsError,
    addCamp: (camp: Camp) => addCampMutation.mutateAsync(camp),
  }
}
