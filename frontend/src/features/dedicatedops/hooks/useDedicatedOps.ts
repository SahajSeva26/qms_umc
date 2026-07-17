import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from '@/features/dedicatedops/dedicatedops.service'
import type { ManpowerRequired, Territory, ScheduleType, SopConfig } from '@/features/dedicatedops/dedicatedops.types'

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
    convertProject: (projectId: string, manpowerRequired: Partial<ManpowerRequired>, territory: Partial<Territory>) =>
      convertMutation.mutateAsync({ projectId, manpowerRequired, territory }),
    assignFo: (args: { foId: string; projectId: string; doctorId: string; clinicLabel: string; startDate: string; scheduleType: ScheduleType; foName: string }) =>
      assignMutation.mutateAsync(args),
    unassignFo: (foId: string) => unassignMutation.mutateAsync(foId),
    saveSop: (projectId: string, patch: Partial<SopConfig>) => sopSaveMutation.mutateAsync({ projectId, patch }),
    resetSop: (projectId: string) => sopResetMutation.mutateAsync(projectId),
  }
}
