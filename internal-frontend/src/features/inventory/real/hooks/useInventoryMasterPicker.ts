import { useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { inventoryMasterKeys } from '@/features/inventory/real/hooks/useInventoryMasters'
import { inventoryMasterService } from '@/features/inventory/real/inventoryMaster.service'
import type { InventoryMasterEntity, InventoryMasterType, SearchInventoryMasterQuery } from '@/types/inventoryMaster.types'
import type { PaginatedResponse } from '@/types/common.types'

const PAGE_SIZE = 10

interface Accumulated {
  key: string
  page: number
  items: InventoryMasterEntity[]
  count: number
  consumedResponse: PaginatedResponse<InventoryMasterEntity> | undefined
}

const EMPTY_ACCUMULATED = (key: string): Accumulated => ({ key, page: 1, items: [], count: 0, consumedResponse: undefined })

function mergeById(existing: InventoryMasterEntity[], incoming: InventoryMasterEntity[]): InventoryMasterEntity[] {
  const byId = new Map(existing.map((i) => [i.id, i]))
  for (const i of incoming) byId.set(i.id, i)
  return Array.from(byId.values())
}

// Paginated catalog search for the devices multi-picker — mirrors
// useEligibleMrs.ts's "load more" shape.
export const useInventoryMasterPicker = (name: string, type: InventoryMasterType, enabled: boolean) => {
  const debouncedName = useDebouncedValue(name, 300)
  const hasQuery = debouncedName.trim().length > 0
  const [page, setPage] = useState(1)
  const key = `${debouncedName}::${type}`
  const [accumulated, setAccumulated] = useState<Accumulated>(() => EMPTY_ACCUMULATED(key))

  if (accumulated.key !== key) {
    setAccumulated(EMPTY_ACCUMULATED(key))
    if (page !== 1) setPage(1)
  }

  const query: SearchInventoryMasterQuery = {
    name: debouncedName.trim() || undefined,
    type,
    page: String(page),
    limit: String(PAGE_SIZE),
  }

  const { data, isLoading, isFetching, error, refetch } = useEntityQuery(
    inventoryMasterKeys,
    (q) => inventoryMasterService.searchInventoryMasters(q),
    query,
    { enabled: enabled && hasQuery },
  )

  if (data && accumulated.key === key && accumulated.consumedResponse !== data) {
    const freshItems = data.data?.items ?? []
    const freshCount = data.data?.count ?? 0
    setAccumulated((prev) => ({
      key,
      page,
      items: page === 1 ? freshItems : mergeById(prev.items, freshItems),
      count: freshCount,
      consumedResponse: data,
    }))
  }

  const isCurrent = accumulated.key === key
  const items = isCurrent ? accumulated.items : []
  const count = isCurrent ? accumulated.count : 0
  const hasMore = items.length < count

  return {
    items,
    count,
    isLoading,
    isFetching,
    error,
    refetch,
    hasMore,
    loadMore: () => setPage((p) => p + 1),
  }
}
