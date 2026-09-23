import { useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { inventoryDeviceKeys } from '@/features/inventory/real/hooks/useInventoryDevices'
import { inventoryDeviceService } from '@/features/inventory/real/inventoryDevice.service'
import type { InventoryDeviceEntity, SearchInventoryDeviceQuery } from '@/types/inventoryDevice.types'
import type { PaginatedResponse } from '@/types/common.types'

const PAGE_SIZE = 10

interface Accumulated {
  key: string
  page: number
  items: InventoryDeviceEntity[]
  count: number
  consumedResponse: PaginatedResponse<InventoryDeviceEntity> | undefined
}

const EMPTY_ACCUMULATED = (key: string): Accumulated => ({ key, page: 1, items: [], count: 0, consumedResponse: undefined })

function mergeById(existing: InventoryDeviceEntity[], incoming: InventoryDeviceEntity[]): InventoryDeviceEntity[] {
  const byId = new Map(existing.map((i) => [i.id, i]))
  for (const i of incoming) byId.set(i.id, i)
  return Array.from(byId.values())
}

// Mirrors useInventoryMasterPicker.ts's "load more" shape. Calls useEntityQuery directly,
// not useInventoryDevices, which has no enabled option and would fire on mount.
export const useInventoryDeviceMultiPicker = (serialNumber: string, enabled: boolean) => {
  const debouncedSerialNumber = useDebouncedValue(serialNumber, 300)
  const hasQuery = debouncedSerialNumber.trim().length > 0
  const [page, setPage] = useState(1)
  const key = debouncedSerialNumber
  const [accumulated, setAccumulated] = useState<Accumulated>(() => EMPTY_ACCUMULATED(key))

  if (accumulated.key !== key) {
    setAccumulated(EMPTY_ACCUMULATED(key))
    if (page !== 1) setPage(1)
  }

  const query: SearchInventoryDeviceQuery = {
    status: 'available',
    serialNumber: debouncedSerialNumber.trim() || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  }

  const { data, isLoading, isFetching, error, refetch } = useEntityQuery(
    inventoryDeviceKeys,
    (q) => inventoryDeviceService.searchInventoryDevices(q),
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
