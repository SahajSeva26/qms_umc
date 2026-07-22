import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'
import { LEAD_STATUS_LABEL } from '@/types/crm.types'
import type { CreateLeadPayload, LeadStatus, SearchLeadQuery, UpdateLeadPayload } from '@/types/crm.types'
import { toast } from '@/components/ui/sonner'

// Single source of truth for leads state via one ['leads', query] TanStack
// Query cache — all mutations invalidate it so every view refetches.
//
// Real backend has NO separate markLost/reopen endpoints (unlike the old
// mock service) — `lost` is just another status reached through the same
// PATCH /leads/:id/stage moveStage path, and there is no reopen path at all
// once a lead is `won`/`lost` (both are terminal in LEAD_TRANSITION_MAP).
//
// Every consumer (Kanban board, KPI strip, client-side status/text filter,
// KAM ownership-scoping) needs the full working set in memory at once —
// none of them paginate. The backend defaults to page=1/limit=10 whenever
// `limit` is omitted (RequestHandler.getPagination), so callers that don't
// pass an explicit limit here would silently only ever see the first 10
// leads company-wide. Default to a high limit unless the caller opts into
// real server-side pagination by passing its own.
const DEFAULT_LEADS_LIMIT = '1000'

export const useLeads = (query: SearchLeadQuery = {}) => {
  const queryClient = useQueryClient()
  const effectiveQuery: SearchLeadQuery = { limit: DEFAULT_LEADS_LIMIT, ...query }

  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', effectiveQuery],
    queryFn: () => crmService.searchLeads(effectiveQuery),
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
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Could not move the lead — try again.'),
  })

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateLeadPayload }) => crmService.updateLead(id, payload),
    onSuccess: () => {
      invalidate()
      toast.success('Lead updated')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not update the lead — try again.'),
  })

  const createLeadMutation = useMutation({
    mutationFn: (payload: CreateLeadPayload) => crmService.createLead(payload),
    onSuccess: () => {
      invalidate()
      toast.success('New lead created')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not create the lead — try again.'),
  })

  const moveStage = (id: string, to: LeadStatus, reason: string) => moveStageMutation.mutate({ id, to, reason })

  // mutateAsync (not mutate) so callers — e.g. EditLeadModal — can await the
  // save and only close on real success, same convention as createLead below.
  const updateLead = (id: string, payload: UpdateLeadPayload) => updateLeadMutation.mutateAsync({ id, payload })

  // mutateAsync (not mutate) so callers — e.g. NewLeadWizard — can await
  // creation and only close/reset on real success, matching the mutateAsync
  // convention used by every other feature's data hook in this app (see
  // useCampsData/useFo/useDoctors/useDedicatedOps/etc).
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
