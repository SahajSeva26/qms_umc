import { useState } from 'react'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { RoleEntity, SearchDownlineMrQuery } from '@/types/accessManagement.types'
import type { PaginatedResponse } from '@/types/common.types'

const downlineMrKeys = createEntityKeys<SearchDownlineMrQuery>('downline-mrs', 'downline-mr')
const PAGE_SIZE = 10

interface Accumulated {
  query: string
  page: number
  items: RoleEntity[]
  count: number
  // The exact response object last folded into `items`/`count` — lets a
  // page-1 response be told apart from "no response consumed yet" (both
  // would otherwise show `page === 1`).
  consumedResponse: PaginatedResponse<RoleEntity> | undefined
}

const EMPTY_ACCUMULATED = (query: string): Accumulated => ({ query, page: 1, items: [], count: 0, consumedResponse: undefined })

// Merges a page's items into what's already accumulated, keyed by id —
// a background refetch of an already-loaded page (window focus, etc.)
// re-delivers the same rows as a NEW response object, so appending
// unconditionally would duplicate them. Existing rows are updated in place
// (in case the underlying data changed); only genuinely new ids are added.
function mergeById(existing: RoleEntity[], incoming: RoleEntity[]): RoleEntity[] {
  const byId = new Map(existing.map((mr) => [mr.id, mr]))
  for (const mr of incoming) byId.set(mr.id, mr)
  return Array.from(byId.values())
}

// GET /roles/mrs — the caller's OWN downline MRs (HO/RSM/ASM), server-scoped
// and server-searched. No client-side hierarchy traversal, no full-list
// fetch: debounced name search + real "load more" pagination (merges pages
// by id rather than replacing them, matching the picker's typeahead-dropdown
// UX). `enabled` lets the caller defer until a dropdown opens (MR role never
// mounts this at all — it has no downline).
export const useEligibleMrs = (name: string, enabled: boolean) => {
  const debouncedName = useDebouncedValue(name, 300)
  const [page, setPage] = useState(1)
  // `items`/`count` are always read together from the same accumulated
  // snapshot — never mixing a fresh `data.count` against a stale `items`
  // from the render before it landed, which briefly made hasMore true while
  // the results list still looked empty.
  const [accumulated, setAccumulated] = useState<Accumulated>(() => EMPTY_ACCUMULATED(debouncedName))

  if (accumulated.query !== debouncedName) {
    // Search text changed — every page fetched so far is invalid; drop back
    // to page 1 and clear results. Setting state during render (not inside
    // an effect) is React's supported way to reset derived state, as long
    // as it happens unconditionally the moment the mismatch is detected.
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
    (q) => accessManagementService.searchDownlineMrs(q),
    query,
    { enabled },
  )

  if (data && accumulated.query === debouncedName && accumulated.consumedResponse !== data) {
    // A response for the current query landed and hasn't been folded in yet
    // — true for page 1's first arrival, a later page, AND a background
    // refetch of an already-loaded page (same page number, new response
    // object) — mergeById makes all three safe.
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
