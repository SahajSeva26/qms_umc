import { useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsService } from '@/features/projects/projects.service'
import type { MoveProjectStagePayload } from '@/types/project.types'
import { toast } from '@/components/ui/sonner'

// The single mutation backing every stage transition (StatusChangeDialog,
// "Close project" — folded into the same generic dialog per the backend's
// one moveStage(to, reason) endpoint; no separate close/renew/void-camp
// endpoints exist).
export const useMoveProjectStage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MoveProjectStagePayload }) =>
      projectsService.moveProjectStage(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] })
      toast.success('Project status updated')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not update status — try again.'),
  })
}
