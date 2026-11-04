import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'
import { useSession } from '@/hooks/useSession'
import type { InventoryAssignmentType } from '@/types/inventoryAssignment.types'

// The logged-in FO's own assignment rows (devices + consumables) — one row per
// (assignee, inventoryType, inventory) triple, scoped to the caller's own role id.
export const useMyInventoryAssignments = (inventoryType?: InventoryAssignmentType) => {
  const { session } = useSession()
  const assignee = session?.role.id
  return useInventoryAssignments({ assignee, inventoryType, limit: '200' }, !!assignee)
}
