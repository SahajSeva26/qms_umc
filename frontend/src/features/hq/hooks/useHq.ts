// HQ Mapping & Serviceability — TanStack Query wrapper over hq.service.ts,
// following the same shape as features/fo/hooks/useFo.ts: thin useQuery reads
// + useMutation writes that invalidate the same key. This screen's "writes"
// are limited to the HQ master list (saveHqs) — classification itself is a
// pure derivation recomputed on every render from the live people/camps/
// devices data, exactly like the prototype's classifyAll() (minus its 4s
// cache, per hq.service.ts's own comment: React Query already handles this).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as hqService from '@/features/hq/hq.service'
import type { HqRecord } from '@/features/hq/hq.types'

export const useHqMaster = () => {
  const queryClient = useQueryClient()
  const { data: hqs = [], isLoading, error } = useQuery({ queryKey: ['hq', 'master'], queryFn: async () => hqService.loadHqs() })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['hq', 'master'] })

  const saveMutation = useMutation({
    mutationFn: async (list: HqRecord[]) => { hqService.saveHqs(list); return list },
    onSuccess: invalidate,
  })

  return {
    hqs,
    isLoading,
    error,
    saveHqs: (list: HqRecord[]) => saveMutation.mutateAsync(list),
    refetch: invalidate,
  }
}
