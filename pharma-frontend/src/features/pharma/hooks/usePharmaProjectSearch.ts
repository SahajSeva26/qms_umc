import { useState } from 'react'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { pharmaProjectsService } from '@/features/pharma/pharmaProjects.service'
import type { ProjectEntity, SearchProjectQuery } from '@/types/project.types'
import type { PaginatedResponse } from '@qms/core'

const pharmaProjectKeys = createEntityKeys<SearchProjectQuery>('pharma-projects', 'pharma-project')

const PAGE_SIZE = 10

interface Accumulated {
  query: string
  page: number
  items: ProjectEntity[]
  count: number
  // Tells a page-1 response apart from "no response consumed yet" —
  // both would otherwise show `page === 1`.
  consumedResponse: PaginatedResponse<ProjectEntity> | undefined
}

const EMPTY_ACCUMULATED = (query: string): Accumulated => ({ query, page: 1, items: [], count: 0, consumedResponse: undefined })

// Keyed by id, not appended — a background refetch of an already-loaded
// page redelivers the same rows as a new response object, which would duplicate them.
function mergeById(existing: ProjectEntity[], incoming: ProjectEntity[]): ProjectEntity[] {
  const byId = new Map(existing.map((p) => [p.id, p]))
  for (const p of incoming) byId.set(p.id, p)
  return Array.from(byId.values())
}

// Browses all of the MR's own live projects the moment the picker opens (no query required).
// Mirrors internal-frontend's usePharmaProjectSearch.ts.
export const usePharmaProjectSearch = (name: string, enabled: boolean) => {
  const debouncedName = useDebouncedValue(name, 300)
  const [page, setPage] = useState(1)
  const [accumulated, setAccumulated] = useState<Accumulated>(() => EMPTY_ACCUMULATED(debouncedName))

  if (accumulated.query !== debouncedName) {
    // Setting state during render, not in an effect, is React's supported
    // way to reset derived state the moment the mismatch is detected.
    setAccumulated(EMPTY_ACCUMULATED(debouncedName))
    if (page !== 1) setPage(1)
  }

  const query: SearchProjectQuery = {
    name: debouncedName.trim() || undefined,
    // Matches the booking restriction to live projects — the backend doesn't enforce this
    // itself, so it's filtered here (same as internal-frontend's own picker).
    status: 'live',
    page: String(page),
    limit: String(PAGE_SIZE),
  }

  const { data, isLoading, isFetching, error, refetch } = useEntityQuery(
    pharmaProjectKeys,
    (q) => pharmaProjectsService.searchScopedProjects(q),
    query,
    { enabled },
  )

  if (data && accumulated.query === debouncedName && accumulated.consumedResponse !== data) {
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
  const projects = isCurrent ? accumulated.items : []
  const count = isCurrent ? accumulated.count : 0
  const hasMore = projects.length < count

  return {
    projects,
    isLoading,
    isFetching,
    error,
    refetch,
    hasMore,
    loadMore: () => setPage((p) => p + 1),
  }
}
