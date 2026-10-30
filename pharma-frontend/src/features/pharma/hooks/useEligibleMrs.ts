import { useState } from 'react'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { searchDownlineMrs } from '@/features/pharma/mr.service'
import type { EligibleMr, SearchDownlineMrQuery } from '@/features/pharma/mr.types'
import type { PaginatedResponse } from '@qms/core'

const downlineMrKeys = createEntityKeys<SearchDownlineMrQuery>('downline-mrs', 'downline-mr')
const PAGE_SIZE = 10

interface Accumulated {
  query: string
  page: number
  items: EligibleMr[]
  count: number
  // Tells a page-1 response apart from "no response consumed yet" —
  // both would otherwise show `page === 1`.
  consumedResponse: PaginatedResponse<EligibleMr> | undefined
}

const EMPTY_ACCUMULATED = (query: string): Accumulated => ({ query, page: 1, items: [], count: 0, consumedResponse: undefined })

// Keyed by id, not appended — a background refetch of an already-loaded
// page redelivers the same rows as a new response object, which would duplicate them.
function mergeById(existing: EligibleMr[], incoming: EligibleMr[]): EligibleMr[] {
  const byId = new Map(existing.map((mr) => [mr.id, mr]))
  for (const mr of incoming) byId.set(mr.id, mr)
  return Array.from(byId.values())
}

// `enabled` gates on the dropdown being open AND a non-empty query — "type to search" rather
// than an eager unfiltered fetch. Mirrors internal-frontend's useEligibleMrs.ts.
export const useEligibleMrs = (name: string, enabled: boolean) => {
  const debouncedName = useDebouncedValue(name, 300)
  const hasQuery = debouncedName.trim().length > 0
  const [page, setPage] = useState(1)
  // `items`/`count` are always read from the same accumulated snapshot —
  // never a fresh `data.count` paired with stale `items`.
  const [accumulated, setAccumulated] = useState<Accumulated>(() => EMPTY_ACCUMULATED(debouncedName))

  if (accumulated.query !== debouncedName) {
    // Setting state during render, not in an effect, is React's supported
    // way to reset derived state the moment the mismatch is detected.
    setAccumulated(EMPTY_ACCUMULATED(debouncedName))
    if (page !== 1) setPage(1)
  }

  const query: SearchDownlineMrQuery = {
    name: debouncedName.trim() || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  }

  const { data, isLoading, isFetching, error, refetch } = useEntityQuery(
    downlineMrKeys,
    (q) => searchDownlineMrs(q),
    query,
    { enabled: enabled && hasQuery },
  )

  if (data && accumulated.query === debouncedName && accumulated.consumedResponse !== data) {
    // Covers page 1's first arrival, a later page, and a background refetch
    // of an already-loaded page alike — mergeById makes all three safe.
    const freshItems = data.data?.items ?? []
    const freshCount = data.data?.count ?? 0
    setAccumulated((prev) => ({
      query: debouncedName,
      page,
      items: page === 1 ? freshItems : mergeById(prev.items, freshItems),
      count: freshCount,
      consumedResponse: data,
    }))
  }

  const isCurrent = accumulated.query === debouncedName
  const mrs = isCurrent ? accumulated.items : []
  const count = isCurrent ? accumulated.count : 0
  const hasMore = mrs.length < count

  return {
    mrs,
    count,
    isLoading,
    isFetching,
    error,
    refetch,
    hasMore,
    loadMore: () => setPage((p) => p + 1),
  }
}
