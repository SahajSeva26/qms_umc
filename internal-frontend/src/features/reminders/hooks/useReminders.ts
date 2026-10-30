import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from '@/features/reminders/reminders.service'
import type { ReminderTemplates, ReminderConfig, RecipientType } from '@/features/reminders/reminders.types'
import type { Camp } from '@/types/camp.types'
import type { Person } from '@/types/people.types'

export const useReminderThreads = (camps: Camp[], people: Person[]) => {
  const queryClient = useQueryClient()
  const { isLoading: tickLoading } = useQuery({
    queryKey: ['reminders', 'tick', camps.length],
    queryFn: () => service.tick(camps, people),
    enabled: camps.length > 0,
    staleTime: 60_000,
  })

  const { data: threads = [], isLoading, error } = useQuery({
    queryKey: ['reminders', 'threads'],
    queryFn: service.getThreads,
    enabled: camps.length > 0,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reminders', 'threads'] })
    queryClient.invalidateQueries({ queryKey: ['reminders', 'tick'] })
  }

  const runTickMutation = useMutation({
    mutationFn: () => service.tick(camps, people),
    onSuccess: invalidate,
  })

  const triggerMutation = useMutation({
    mutationFn: ({ campId, recipientType, recipientId, stage }: { campId: string; recipientType: RecipientType; recipientId: string; stage: string }) =>
      service.manualTrigger(campId, recipientType, recipientId, stage, camps, people),
    onSuccess: invalidate,
  })

  const bulkMutation = useMutation({
    mutationFn: (stage: string) => service.bulkTrigger(stage, camps, people),
    onSuccess: invalidate,
  })

  return {
    threads,
    isLoading: isLoading || tickLoading,
    error,
    runTick: () => runTickMutation.mutateAsync(),
    manualTrigger: (campId: string, recipientType: RecipientType, recipientId: string, stage: string) =>
      triggerMutation.mutateAsync({ campId, recipientType, recipientId, stage }),
    bulkTrigger: (stage: string) => bulkMutation.mutateAsync(stage),
    refresh: invalidate,
  }
}

export const useReminderTemplates = () => {
  const queryClient = useQueryClient()
  const { data: templates, isLoading, error } = useQuery({ queryKey: ['reminders', 'templates'], queryFn: async () => service.getTemplates() })

  const saveMutation = useMutation({
    mutationFn: (next: ReminderTemplates) => service.saveTemplates(next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders', 'templates'] }),
  })

  return {
    templates,
    isLoading,
    error,
    saveTemplates: (next: ReminderTemplates) => saveMutation.mutateAsync(next),
  }
}

export const useReminderConfig = () => {
  const queryClient = useQueryClient()
  const { data: config, isLoading, error } = useQuery({ queryKey: ['reminders', 'config'], queryFn: async () => service.getConfig() })

  const saveMutation = useMutation({
    mutationFn: (patch: Partial<ReminderConfig>) => service.saveConfig(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders', 'config'] }),
  })

  return {
    config,
    isLoading,
    error,
    saveConfig: (patch: Partial<ReminderConfig>) => saveMutation.mutateAsync(patch),
  }
}
