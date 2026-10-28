import { useQuery } from '@tanstack/react-query'
import { inventoryAssignmentService } from '@/features/inventory/real/inventoryAssignment.service'

const STALE_TIME_MS = 60_000

// inventory-assignment:manage only, no call fired otherwise. One request — the aggregation
// returns every active FO role in a single response.
export const useFoRoster = (enabled: boolean) =>
  useQuery({
    queryKey: ['inventory-assignments', 'report', 'fo-roster'],
    queryFn: () => inventoryAssignmentService.getInventoryAssignmentReport(),
    enabled,
    staleTime: STALE_TIME_MS,
  })
