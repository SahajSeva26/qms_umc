import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from '@/features/dedicatedops/dedicatedops.service'
import type { ManpowerRequired, Territory, ScheduleType, SopConfig } from '@/features/dedicatedops/dedicatedops.types'

// MUTATION API: every mutation below is returned as its raw TanStack mutation
// object (`.mutateAsync`, `.isPending`, `.error`), matching the pattern
// already established in features/diet's hooks. This hook previously
// returned bare async functions (`assignFo: (args) => mutation.mutateAsync(args)`),
// which discarded isPending/error and left every call site with nothing but a
// floating promise — five UI actions across the page and its modals were
// fire-and-forget, so a failed or unauthorized write looked identical to a
// successful one. Returning the mutation objects fixes that without adding a
// second state-management layer on top of TanStack, and gives a future RBAC
// check one obvious place per action to live.
export const useDedicatedOps = () => {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({ queryKey: ['dedicatedops'], queryFn: service.getData })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dedicatedops'] })

  const convertMutation = useMutation({
    mutationFn: ({ projectId, manpowerRequired, territory }: { projectId: string; manpowerRequired: Partial<ManpowerRequired>; territory: Partial<Territory> }) =>
      service.convertProjectToDedicated(projectId, { manpowerRequired, territory }),
    onSuccess: invalidate,
  })

  const assignMutation = useMutation({
    mutationFn: (args: { foId: string; projectId: string; doctorId: string; clinicLabel: string; startDate: string; scheduleType: ScheduleType; foName: string }) =>
      service.assignFoToProject(args.foId, args.projectId, args.doctorId, args),
    onSuccess: invalidate,
  })

  const unassignMutation = useMutation({
    mutationFn: (foId: string) => service.unassignFo(foId),
    onSuccess: invalidate,
  })

  const sopSaveMutation = useMutation({
    mutationFn: ({ projectId, patch }: { projectId: string; patch: Partial<SopConfig> }) => service.setSopConfig(projectId, patch),
    onSuccess: invalidate,
  })

  const sopResetMutation = useMutation({
    mutationFn: (projectId: string) => service.resetSopConfig(projectId),
    onSuccess: invalidate,
  })

  return {
    projectConfigs: data?.projectConfigs ?? {},
    assignments: data?.assignments ?? {},
    attendance: data?.attendance ?? [],
    screenings: data?.screenings ?? [],
    isLoading,
    error,

    // Mutations — raw TanStack objects. Call `.mutateAsync(vars)` and read
    // `.isPending` / `.error`. Callers must handle rejection; a failed write
    // now rejects rather than resolving silently (see dedicatedops.service.ts's
    // persist()).
    convertProject: convertMutation,
    assignFo: assignMutation,
    unassignFo: unassignMutation,
    saveSop: sopSaveMutation,
    resetSop: sopResetMutation,
  }
}
