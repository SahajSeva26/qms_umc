import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'
import type { InventoryAssignmentType } from '@/features/inventory/real/inventoryAssignment.types'

// Feeds a picker over what one FO holds, not a paginated table — the panel's
// default PAGE_SIZE of 10 would make holdings past page 1 unselectable for a return.
const HOLDINGS_LIMIT = 100

// The only correct source for a return-line's item choices — never a global
// device/consumable search, which would let an FO pick another FO's device.
export const useAssigneeHoldings = (assigneeRoleId: string, inventoryType: InventoryAssignmentType, enabled = true) =>
  useInventoryAssignments({
    assignee: assigneeRoleId || undefined,
    inventoryType,
    limit: String(HOLDINGS_LIMIT),
  }, enabled && !!assigneeRoleId)
