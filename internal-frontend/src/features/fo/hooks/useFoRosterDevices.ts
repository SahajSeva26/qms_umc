import { useQueries } from '@tanstack/react-query'
import { inventoryAssignmentService } from '@/features/inventory/real/inventoryAssignment.service'
import { inventoryAssignmentKeys } from '@/features/inventory/real/hooks/useInventoryAssignments'
import type { InventoryAssignmentEntity } from '@/types/inventoryAssignment.types'

export interface FoRosterDeviceEntry {
  assignments: InventoryAssignmentEntity[]
  isLoading: boolean
  // A failed fetch must never read as "no devices" — callers check this first.
  error: unknown
  refetch: () => void
  // True once this FO holds more assignments than the 100-row cap below.
  truncated: boolean
}

// One real `GET /inventory-assignments?assignee=<roleId>` per visible roster
// row — same bounded-N+1 tradeoff as useFoRosterCamps.
export function useFoRosterDevices(roleIds: string[]): Record<string, FoRosterDeviceEntry> {
  const queries = useQueries({
    queries: roleIds.map((roleId) => ({
      queryKey: inventoryAssignmentKeys.list({ assignee: roleId, limit: '100' }),
      queryFn: () => inventoryAssignmentService.searchInventoryAssignments({ assignee: roleId, limit: '100' }),
    })),
  })

  const result: Record<string, FoRosterDeviceEntry> = {}
  roleIds.forEach((roleId, i) => {
    const query = queries[i]
    const assignments = query.data?.data?.items ?? []
    const count = query.data?.data?.count ?? 0
    result[roleId] = {
      assignments,
      isLoading: query.isLoading,
      error: query.error,
      refetch: () => query.refetch(),
      truncated: count > assignments.length,
    }
  })
  return result
}
