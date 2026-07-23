import { useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsService } from '@/features/projects/projects.service'
import type { CreateProjectPayload } from '@/types/project.types'

// Mirrors useCreateDivision.ts exactly. Consumer calls mutateAsync and awaits
// it (per EditLeadModal's consumption convention), only closing the wizard on
// real success.
export const useCreateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => projectsService.createProject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
