import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { inventoryRequestService } from '@/features/inventory/real/inventoryRequest.service'
import type { SearchInventoryRequestQuery } from '@/types/inventoryRequest.types'

export const inventoryRequestKeys = createEntityKeys<SearchInventoryRequestQuery>('inventory-requests')

// Unlike device/consumable/master, GET /inventory-requests is NOT open to
// every authenticated user — it requires inventory-request:search OR :manage
// (confirmed directly from the route guard). The caller (InventoryRequestsPanel)
// is responsible for checking that permission BEFORE mounting this hook at
// all — passing enabled:false here still constructs the query, it doesn't
// prevent a caller from rendering a 403 error state if they mount it wrongly.
export const useInventoryRequests = (query: SearchInventoryRequestQuery, enabled = true) =>
  useEntityQuery(inventoryRequestKeys, (q) => inventoryRequestService.searchInventoryRequests(q), query, { enabled })
