import { useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsService } from '@/features/projects/projects.service'
import type { UpdateProjectPayload } from '@/types/project.types'

export const useUpdateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProjectPayload }) =>
      projectsService.updateProject(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] })
    },
  })
}
