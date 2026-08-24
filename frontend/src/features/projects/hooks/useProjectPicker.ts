import { useState } from 'react'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { projectKeys } from '@/features/projects/hooks/useProjects'
import { projectsService } from '@/features/projects/projects.service'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { ProjectEntity, SearchProjectQuery } from '@/types/project.types'
import type { PaginatedResponse } from '@/types/common.types'

const PAGE_SIZE = 10

interface Accumulated {
  key: string
  page: number
  items: ProjectEntity[]
  count: number
  // Tells a page-1 response apart from "no response consumed yet" —
  // both would otherwise show `page === 1`.
  consumedResponse: PaginatedResponse<ProjectEntity> | undefined
}

const EMPTY_ACCUMULATED = (key: string): Accumulated => ({ key, page: 1, items: [], count: 0, consumedResponse: undefined })

// Keyed by id, not appended — a background refetch of an already-loaded
// page redelivers the same rows as a new response object, which would duplicate them.
function mergeById(existing: ProjectEntity[], incoming: ProjectEntity[]): ProjectEntity[] {
  const byId = new Map(existing.map((p) => [p.id, p]))
  for (const p of incoming) byId.set(p.id, p)
  return Array.from(byId.values())
}

// Server-scoped/searched projects for a picker — debounced name search + "load
// more" pagination, mirroring useEligibleMrs.ts's shape.
export const useProjectPicker = (name: string, tenant: string | undefined, enabled: boolean) => {
  const debouncedName = useDebouncedValue(name, 300)
  const hasQuery = debouncedName.trim().length > 0
  const [page, setPage] = useState(1)
  // Accumulation is keyed by query+tenant together — changing either resets pagination.
  const key = `${debouncedName}::${tenant ?? ''}`
  const [accumulated, setAccumulated] = useState<Accumulated>(() => EMPTY_ACCUMULATED(key))

  if (accumulated.key !== key) {
    // Setting state during render, not in an effect, is React's supported
    // way to reset derived state the moment the mismatch is detected.
    setAccumulated(EMPTY_ACCUMULATED(key))
    if (page !== 1) setPage(1)
  }

  const query: SearchProjectQuery = {
    name: debouncedName.trim() || undefined,
    tenant: tenant || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  }

  const { data, isLoading, isFetching, error, refetch } = useEntityQuery(
    projectKeys,
    (q) => projectsService.searchProjects(q),
    query,
    { enabled: enabled && hasQuery && !!tenant },
  )

  if (data && accumulated.key === key && accumulated.consumedResponse !== data) {
    // Covers page 1's first arrival, a later page, and a background refetch
    // of an already-loaded page alike — mergeById makes all three safe.
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
  const projects = isCurrent ? accumulated.items : []
  const count = isCurrent ? accumulated.count : 0
  const hasMore = projects.length < count

  return {
    projects,
    count,
    isLoading,
    isFetching,
    error,
    refetch,
    hasMore,
    loadMore: () => setPage((p) => p + 1),
  }
}
