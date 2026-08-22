import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { inventoryLedgerService } from '@/features/inventory/real/inventoryLedger.service'
import type { SearchInventoryLedgerQuery } from '@/features/inventory/real/inventoryLedger.types'

export const inventoryLedgerKeys = createEntityKeys<SearchInventoryLedgerQuery>('inventory-ledgers')

// Unlike device/consumable/assignment, reads here require inventory-ledger:manage — pass canManage as `enabled`.
export const useInventoryLedgers = (query: SearchInventoryLedgerQuery, enabled = true) =>
  useEntityQuery(inventoryLedgerKeys, (q) => inventoryLedgerService.searchInventoryLedgers(q), query, { enabled })
