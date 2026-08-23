import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'
import { LEAD_STATUS_LABEL } from '@/features/crm/crm.constants'
import type { CreateLeadPayload, LeadStatus, SearchLeadQuery, UpdateLeadPayload } from '@/features/crm/crm.types'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'

// `lost` is reached through the same PATCH /leads/:id/stage moveStage path;
// there is no separate markLost/reopen endpoint, and won/lost are terminal.
//
// Default limit matches the backend's page=1/limit=10 default. A caller
// needing the full working set must pass its own explicit `limit`.
const DEFAULT_LEADS_LIMIT = '10'

// `fetchList` (default true) lets a caller that only needs the mutations
// skip the list query entirely.
export const useLeads = (query: SearchLeadQuery = {}, fetchList: boolean = true) => {
  const queryClient = useQueryClient()
  const effectiveQuery: SearchLeadQuery = { limit: DEFAULT_LEADS_LIMIT, ...query }

  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', effectiveQuery],
    queryFn: () => crmService.searchLeads(effectiveQuery),
    enabled: fetchList,
  })

  const leads = data?.data?.items ?? []
  const count = data?.data?.count ?? 0

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['leads'] })

  const moveStageMutation = useMutation({
    mutationFn: ({ id, to, reason }: { id: string; to: LeadStatus; reason: string }) =>
      crmService.moveLeadStage(id, { to, reason }),
    onSuccess: (_, { to }) => {
      invalidate()
      toast.success(`Moved to ${LEAD_STATUS_LABEL[to]}`)
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not move the lead — try again.')),
  })

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLeadPayload }) => crmService.updateLead(id, payload),
    onSuccess: () => {
      invalidate()
      toast.success('Lead updated')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update the lead — try again.')),
  })

  const createLeadMutation = useMutation({
    mutationFn: (payload: CreateLeadPayload) => crmService.createLead(payload),
    onSuccess: () => {
      invalidate()
      toast.success('New lead created')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not create the lead — try again.')),
  })

  const moveStage = (id: string, to: LeadStatus, reason: string) => moveStageMutation.mutate({ id, to, reason })

  // mutateAsync so callers can await the save and only close on real success.
  const updateLead = (id: string, payload: UpdateLeadPayload) => updateLeadMutation.mutateAsync({ id, payload })

  // mutateAsync so callers can await creation and only close/reset on real success.
  const createLead = (payload: CreateLeadPayload) => createLeadMutation.mutateAsync(payload)

  return {
    leads,
    count,
    isLoading,
    error,
    moveStage,
    updateLead,
    createLead,
    isMovingStage: moveStageMutation.isPending,
    isUpdating: updateLeadMutation.isPending,
    isCreating: createLeadMutation.isPending,
  }
}
