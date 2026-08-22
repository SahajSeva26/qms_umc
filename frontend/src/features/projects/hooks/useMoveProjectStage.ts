import { useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsService } from '@/features/projects/projects.service'
import { projectKeys } from '@/features/projects/hooks/useProjects'
import type { MoveProjectStagePayload } from '@/features/projects/project.types'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'

// Backs every stage transition dialog — the backend has one moveStage(to,
// reason) endpoint, no separate close/renew/void-camp endpoints.
export const useMoveProjectStage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MoveProjectStagePayload }) =>
      projectsService.moveProjectStage(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all })
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) })
      toast.success('Project status updated')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update status — try again.')),
  })
}
