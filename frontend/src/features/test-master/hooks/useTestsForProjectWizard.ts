import { useInfiniteQuery, type InfiniteData, type QueryKey } from '@tanstack/react-query'
import { testKeys } from '@/features/test-master/hooks/useTests'
import { testService } from '@/features/test-master/test.service'
import type { ProjectTherapy } from '@/types/project.types'
import type { TestEntity } from '@/features/test-master/testMaster.types'
import type { CampType } from '@/types/campReal.types'
import type { PaginatedResponse } from '@/types/common.types'

const PAGE_SIZE = 20

// Always called (never conditionally) to satisfy the Rules of Hooks; `active`
// gates the actual network request via `enabled` instead.
function useCampTypeSlot(therapy: ProjectTherapy | undefined, campType: CampType, active: boolean) {
  const enabled = active && !!therapy

  const { data, isLoading, isFetching, error, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery<
    PaginatedResponse<TestEntity>,
    Error,
    InfiniteData<PaginatedResponse<TestEntity>>,
    QueryKey,
    number
  >({
    queryKey: [...testKeys.list({ therapy, campType, status: 'active' })],
    queryFn: ({ pageParam }) =>
      testService.searchTests({ therapy, campType, status: 'active', page: String(pageParam), limit: String(PAGE_SIZE) }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      allPages.flatMap((p) => p.data?.items ?? []).length < (lastPage.data?.count ?? 0) ? allPages.length + 1 : undefined,
    enabled,
  })

  // `enabled: false` stops new fetches but still returns stale cached pages,
  // so `active` must gate the read here explicitly too.
  const items = active ? data?.pages.flatMap((p) => p.data?.items ?? []) ?? [] : []

  return {
    items,
    active,
    hasMore: active && !!hasNextPage,
    isLoading: active && isLoading,
    isFetching: active && isFetching,
    error: active ? error : null,
    // React Query's fetchNextPage/refetch ignore `enabled` and fire
    // regardless once called, so each needs its own guard here too.
    loadMore: () => {
      if (active && hasNextPage) return fetchNextPage()
    },
    refetch: () => {
      if (active) return refetch()
    },
  }
}

// Backend's campType search filter accepts only one value at a time, so a
// project spanning multiple camp types (or `mixed`) needs one parallel,
// independently-paginated request per type, merged/deduped into one list.
// `canBrowseTests` gates the query since not every project-creating actor
// holds test-master:search/manage (mirrors EditTestModal's canViewResults).
export function useTestsForProjectWizard(therapy: ProjectTherapy | '', allowedCampTypes: CampType[], canBrowseTests: boolean) {
  const enabled = canBrowseTests && !!therapy && allowedCampTypes.length > 0
  const therapyArg = therapy || undefined

  // Fixed 3 slots, always called in the same order — never a variable-length
  // loop over allowedCampTypes, which would change hook-call count per render.
  const screening = useCampTypeSlot(therapyArg, 'screening', enabled && allowedCampTypes.includes('screening'))
  const diet = useCampTypeSlot(therapyArg, 'diet', enabled && allowedCampTypes.includes('diet'))
  const lab = useCampTypeSlot(therapyArg, 'lab', enabled && allowedCampTypes.includes('lab'))
  const slots = [screening, diet, lab]

  const byId = new Map<string, TestEntity>()
  for (const slot of slots) {
    for (const item of slot.items) byId.set(item.id, item)
  }
  const tests = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))

  return {
    tests,
    isLoading: slots.some((s) => s.isLoading),
    isFetching: slots.some((s) => s.isFetching),
    error: slots.find((s) => s.error)?.error ?? null,
    hasMore: slots.some((s) => s.hasMore),
    loadMore: () => slots.forEach((s) => { if (s.hasMore) s.loadMore() }),
    // Only active slots — refetch() ignores `enabled` and fires regardless,
    // which would hit a camp type no longer in the current selection.
    refetch: () => slots.forEach((s) => { if (s.active) s.refetch() }),
  }
}
