import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Project, ProjectStatus, VoidCamp } from '@/types/project.types'
import * as projectsService from '@/features/projects/projects.service'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/features/auth/store'

export const useProjects = () => {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsService.getProjects,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['projects'] })

  const createProjectMutation = useMutation({
    mutationFn: (project: Project) => projectsService.createProject(project),
    onSuccess: () => {
      invalidate()
      toast.success('Project created')
    },
    onError: () => toast.error('Could not create the project — try again.'),
  })

  const updateProjectMutation = useMutation({
    mutationFn: (project: Project) => projectsService.updateProject(project),
    onSuccess: () => {
      invalidate()
      toast.success('Project updated')
    },
    onError: () => toast.error('Could not update the project — try again.'),
  })

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: ProjectStatus; reason: string }) =>
      projectsService.changeStatus(id, status, reason, `${user?.firstName ?? 'Unknown'} ${user?.lastName ?? 'user'}`.trim()),
    onSuccess: () => {
      invalidate()
      toast.success('Status updated')
    },
    onError: () => toast.error('Could not change status — try again.'),
  })

  const closeProjectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => projectsService.closeProject(id, reason),
    onSuccess: () => {
      invalidate()
      toast.success('Project closed')
    },
    onError: () => toast.error('Could not close the project — try again.'),
  })

  const reopenProjectMutation = useMutation({
    mutationFn: (id: string) => projectsService.reopenProject(id),
    onSuccess: () => {
      invalidate()
      toast.success('Project reopened to Hold')
    },
    onError: () => toast.error('Could not reopen the project — try again.'),
  })

  const renewProjectMutation = useMutation({
    mutationFn: ({ sourceId, input }: { sourceId: string; input: { id: string; name: string; poDate: string; poExpiry: string; poNo: string } }) =>
      projectsService.renewProject(sourceId, input),
    onSuccess: () => {
      invalidate()
      toast.success('Project renewed')
    },
    onError: () => toast.error('Could not renew the project — try again.'),
  })

  const addVoidCampMutation = useMutation({
    mutationFn: ({ projectId, voidCamp }: { projectId: string; voidCamp: VoidCamp }) =>
      projectsService.addVoidCamp(projectId, voidCamp),
    onSuccess: () => {
      invalidate()
      toast.success('Void camp added')
    },
    onError: () => toast.error('Could not add the void camp — try again.'),
  })

  const removeVoidCampMutation = useMutation({
    mutationFn: ({ projectId, voidCampId }: { projectId: string; voidCampId: string }) =>
      projectsService.removeVoidCamp(projectId, voidCampId),
    onSuccess: () => {
      invalidate()
      toast.success('Void camp removed')
    },
    onError: () => toast.error('Could not remove the void camp — try again.'),
  })

  return {
    projects,
    isLoading,
    error,
    createProject: (project: Project) => createProjectMutation.mutate(project),
    updateProject: (project: Project) => updateProjectMutation.mutate(project),
    changeStatus: (id: string, status: ProjectStatus, reason: string) => changeStatusMutation.mutate({ id, status, reason }),
    closeProject: (id: string, reason: string) => closeProjectMutation.mutate({ id, reason }),
    reopenProject: (id: string) => reopenProjectMutation.mutate(id),
    renewProject: (sourceId: string, input: { id: string; name: string; poDate: string; poExpiry: string; poNo: string }) =>
      renewProjectMutation.mutate({ sourceId, input }),
    addVoidCamp: (projectId: string, voidCamp: VoidCamp) => addVoidCampMutation.mutate({ projectId, voidCamp }),
    removeVoidCamp: (projectId: string, voidCampId: string) => removeVoidCampMutation.mutate({ projectId, voidCampId }),
  }
}
