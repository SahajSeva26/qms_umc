import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Lead } from '@/types/lead.types'
import type { ClientProject } from '@/types/client.types'
import type { SalesMeeting } from '@/types/salesdash.types'
import * as tasksService from '@/features/crm/sales/sales.tasks.service'

interface UseSalesTasksInput {
  ownerKeys: string[]
  meetings: SalesMeeting[]
  leads: Lead[]
  projects: ClientProject[]
  projectOwnerKey: (project: ClientProject) => string | undefined
}

export const useSalesTasks = ({ ownerKeys, meetings, leads, projects, projectOwnerKey }: UseSalesTasksInput) => {
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['sales-tasks', ownerKeys],
    queryFn: () => tasksService.getTasksForOwners(ownerKeys, { meetings, leads, projects, projectOwnerKey }),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sales-tasks'] })

  const markDoneMutation = useMutation({
    mutationFn: (taskId: string) => tasksService.markTaskDone(taskId),
    onSuccess: invalidate,
  })

  const snoozeMutation = useMutation({
    mutationFn: ({ taskId, snoozedTo, snoozedTime }: { taskId: string; snoozedTo: string; snoozedTime?: string }) =>
      tasksService.snoozeTask(taskId, snoozedTo, snoozedTime),
    onSuccess: invalidate,
  })

  const addTaskMutation = useMutation({
    mutationFn: (input: tasksService.AddTaskInput) => tasksService.addTask(input),
    onSuccess: invalidate,
  })

  return {
    tasks,
    isLoading,
    error,
    markDone: (taskId: string) => markDoneMutation.mutate(taskId),
    snooze: (taskId: string, snoozedTo: string, snoozedTime?: string) =>
      snoozeMutation.mutate({ taskId, snoozedTo, snoozedTime }),
    addTask: (input: tasksService.AddTaskInput) => addTaskMutation.mutate(input),
  }
}
