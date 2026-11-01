import api from '@/lib/api/api'
import type { PaginatedResponse } from '@/types/common.types'
import type { InventoryLedgerEntity, SearchInventoryLedgerQuery } from '@/types/inventoryLedger.types'

const searchInventoryLedgers = async (query: SearchInventoryLedgerQuery) => {
  const res = await api.get<PaginatedResponse<InventoryLedgerEntity>>('/inventory-ledgers', { params: query })
  return res.data
}

export const inventoryLedgerService = {
  searchInventoryLedgers,
}
