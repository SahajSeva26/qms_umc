import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Lead, LeadStage } from '@/types/lead.types'
import * as crmService from '@/features/crm/crm.service'
import { STAGES, LOST_STAGE } from '@/features/crm/crm.mock'
import { toast } from '@/components/ui/sonner'

const stageName = (stage: LeadStage) => (stage === 'lost' ? LOST_STAGE : STAGES.find((s) => s.id === stage))?.name ?? stage

// Single source of truth for leads state — the prototype had a two-array-drift
// bug (QMS_CRM.leads vs crm.js's sliced copy) where wizard-created leads
// didn't reliably show up in the views that just created them. TanStack Query
// gives us one ['leads'] cache instead, so mutations invalidate everywhere.
export const useLeads = () => {
  const queryClient = useQueryClient()

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['leads'],
    queryFn: crmService.getLeads,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['leads'] })

  const moveStageMutation = useMutation({
    mutationFn: ({ id, toStage, reason }: { id: string; toStage: LeadStage; reason: string }) =>
      crmService.moveStage(id, toStage, reason),
    onSuccess: (_, { toStage }) => {
      invalidate()
      toast.success(`Moved to ${stageName(toStage)}`)
    },
    onError: () => toast.error('Could not move the lead — try again.'),
  })

  const markLostMutation = useMutation({
    mutationFn: ({ id, category, reason }: { id: string; category: string; reason: string }) =>
      crmService.markLost(id, category, reason),
    onSuccess: () => {
      invalidate()
      toast.success('Lead marked as lost')
    },
    onError: () => toast.error('Could not mark the lead as lost — try again.'),
  })

  const reopenMutation = useMutation({
    mutationFn: (id: string) => crmService.reopen(id),
    onSuccess: () => {
      invalidate()
      toast.success('Lead reopened to Negotiation')
    },
    onError: () => toast.error('Could not reopen the lead — try again.'),
  })

  const createLeadMutation = useMutation({
    mutationFn: (lead: Lead) => crmService.createLead(lead),
    onSuccess: () => {
      invalidate()
      toast.success('New lead created')
    },
    onError: () => toast.error('Could not create the lead — try again.'),
  })

  const moveStage = (id: string, toStage: LeadStage, reason: string) =>
    moveStageMutation.mutate({ id, toStage, reason })

  const markLost = (id: string, category: string, reason: string) =>
    markLostMutation.mutate({ id, category, reason })

  const reopen = (id: string) => reopenMutation.mutate(id)

  const createLead = (lead: Lead) => createLeadMutation.mutate(lead)

  return { leads, isLoading, error, moveStage, markLost, reopen, createLead }
}
