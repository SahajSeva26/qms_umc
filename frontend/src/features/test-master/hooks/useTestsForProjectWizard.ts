import { useInfiniteQuery, type InfiniteData, type QueryKey } from '@tanstack/react-query'
import { testKeys } from '@/features/test-master/hooks/useTests'
import { testService } from '@/features/test-master/test.service'
import type { ProjectTherapy } from '@/types/project.types'
import type { TestEntity } from '@/features/test-master/testMaster.types'
import type { CampType } from '@/types/campReal.types'
import type { PaginatedResponse } from '@/types/common.types'

const PAGE_SIZE = 20

// One accumulating, paginated slot for a single fixed campType. Always
// called — never conditionally — so the hook obeys the Rules of Hooks
// regardless of how many camp types are actually active at once; `active`
// (whether this specific campType is currently relevant) is what actually
// gates the network request via `enabled`.
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

  // useInfiniteQuery's `enabled: false` stops new fetches but, like
  // useQuery, still returns the last-cached data.pages for a slot that's
  // gone inactive — so `active` must still gate the read here explicitly.
  const items = active ? data?.pages.flatMap((p) => p.data?.items ?? []) ?? [] : []

  return {
    items,
    active,
    hasMore: active && !!hasNextPage,
    isLoading: active && isLoading,
    isFetching: active && isFetching,
    error: active ? error : null,
    // Always-present guarded functions, not conditionally-undefined
    // references — the outer hook's slots.forEach already guards its own
    // calls (s.hasMore / s.active below), but that guard only decides
    // whether to call these at all; it doesn't stop React Query's own
    // fetchNextPage/refetch from ignoring `enabled` and firing regardless
    // once called, so each slot still needs its own internal guard too.
    loadMore: () => {
      if (active && hasNextPage) return fetchNextPage()
    },
    refetch: () => {
      if (active) return refetch()
    },
  }
}

// Real, bounded pagination (PAGE_SIZE=20 per page, "load more" accumulates
// further pages) across every camp type currently allowed for the wizard's
// selected project type(s) — never a single `limit: '10'` call that silently
// truncates the catalog, and never an unbounded `limit: '0'` blast either.
// The backend's own campType search filter only accepts one value at a
// time (testMaster.service.ts), so a project spanning more than one
// compatible camp type (or `mixed`, which spans all three) needs one
// parallel, independently-paginated request per camp type rather than a
// single query — merged and deduped here into one flat, name-sorted list.
// `canBrowseTests` gates the query itself (never firing a request the
// backend would 403) — GET /test-masters requires test-master:search/manage,
// which not every actor who can create a project necessarily holds (only
// Field Officer and the two Ops Manager role types hold it by default).
// Mirrors EditTestModal.tsx's canViewResults pattern for the same reason.
export function useTestsForProjectWizard(therapy: ProjectTherapy | '', allowedCampTypes: CampType[], canBrowseTests: boolean) {
  const enabled = canBrowseTests && !!therapy && allowedCampTypes.length > 0
  const therapyArg = therapy || undefined

  // Exactly 3 fixed slots (screening/diet/lab), always called in this same
  // order on every render — never a variable-length loop over
  // allowedCampTypes, which could change the number of hook calls between
  // renders. `active` (not whether the hook itself runs) is what actually
  // turns each slot's network request on or off.
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
    // Only active slots — React Query's refetch() ignores `enabled` and
    // fires regardless, so calling it unconditionally on every slot would
    // force a network request for a camp type the current project type
    // selection no longer includes.
    refetch: () => slots.forEach((s) => { if (s.active) s.refetch() }),
  }
}
