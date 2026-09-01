import { useState } from 'react'
import { useEntityQuery } from '@/hooks/useEntityQuery'
import { testKeys } from '@/features/test-master/hooks/useTests'
import { testService } from '@/features/test-master/test.service'
import type { ProjectTherapy } from '@/types/project.types'
import type { TestEntity, SearchTestQuery } from '@/features/test-master/testMaster.types'
import type { CampType } from '@/types/campReal.types'
import type { PaginatedResponse } from '@/types/common.types'

const PAGE_SIZE = 20

interface Accumulated {
  key: string
  page: number
  items: TestEntity[]
  count: number
  // Tells a page-1 response apart from "no response consumed yet" — both
  // would otherwise show `page === 1`. Same idiom as useProjectPicker.ts /
  // useInventoryMasterPicker.ts.
  consumedResponse: PaginatedResponse<TestEntity> | undefined
}

const EMPTY_ACCUMULATED = (key: string): Accumulated => ({ key, page: 1, items: [], count: 0, consumedResponse: undefined })

// One accumulating, paginated slot for a single fixed campType. Always
// called — never conditionally — so the hook obeys the Rules of Hooks
// regardless of how many camp types are actually active at once; `active`
// (whether this specific campType is currently relevant) is what actually
// gates the network request via `enabled`.
function useCampTypeSlot(therapy: ProjectTherapy | undefined, campType: CampType, active: boolean) {
  const [page, setPage] = useState(1)
  const key = `${therapy ?? ''}::${campType}::${active}`
  const [accumulated, setAccumulated] = useState<Accumulated>(() => EMPTY_ACCUMULATED(key))

  if (accumulated.key !== key) {
    setAccumulated(EMPTY_ACCUMULATED(key))
    if (page !== 1) setPage(1)
  }

  const query: SearchTestQuery = {
    therapy,
    campType,
    status: 'active',
    page: String(page),
    limit: String(PAGE_SIZE),
  }

  const { data, isLoading, isFetching, error, refetch } = useEntityQuery(
    testKeys,
    (q) => testService.searchTests(q),
    query,
    { enabled: active && !!therapy },
  )

  if (data && accumulated.key === key && accumulated.consumedResponse !== data) {
    const freshItems = data.data?.items ?? []
    const freshCount = data.data?.count ?? 0
    setAccumulated((prev) => ({
      key,
      page,
      items: page === 1 ? freshItems : [...prev.items, ...freshItems],
      count: freshCount,
      consumedResponse: data,
    }))
  }

  const isCurrent = accumulated.key === key
  const count = isCurrent ? accumulated.count : 0

  return {
    // Never surface accumulated items for an inactive slot — a forced
    // refetch() (see the outer hook's refetch, and React Query's own
    // documented behavior that a manual refetch() ignores `enabled`) can
    // still resolve and repopulate `accumulated` for a slot whose `key`
    // happens to already match (nothing else about the key changed except
    // `active` itself flipping earlier), which would otherwise let a
    // now-irrelevant camp type's tests silently reappear in the merged list.
    items: active && isCurrent ? accumulated.items : [],
    active,
    hasMore: active && isCurrent && accumulated.items.length < count,
    isLoading: active && isLoading,
    isFetching: active && isFetching,
    error: active ? error : null,
    refetch,
    loadMore: () => setPage((p) => p + 1),
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
    // force a network request (and risk repopulating accumulated state, see
    // useCampTypeSlot's own `active` guard above) for a camp type the
    // current project type selection no longer includes.
    refetch: () => slots.forEach((s) => { if (s.active) s.refetch() }),
  }
}
