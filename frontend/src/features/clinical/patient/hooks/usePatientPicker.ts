import { useInfiniteQuery, type InfiniteData, type QueryKey } from '@tanstack/react-query'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { patientKeys } from '@/features/clinical/patient/hooks/usePatients'
import { patientService } from '@/features/clinical/patient/patient.service'
import type { SearchPatientQuery } from '@/features/clinical/patient/patient.types'
import type { PaginatedResponse } from '@/types/common.types'
import type { PatientEntity } from '@/features/clinical/patient/patient.types'

const PAGE_SIZE = 10

// Pure so it can run identically on the raw and debounced query — the only
// way to guarantee the two classifications never drift apart.
interface QueryClassification {
  isMobileQuery: boolean
  isCompleteCode: boolean
  isNameQuery: boolean
  hasSearchableQuery: boolean
}

// Strict thresholds since this hits the global, unscoped patient registry: a
// numeric fragment under 6 digits or an incomplete code (`pat-12`) must fetch
// nothing rather than silently fall through to a name search.
function classifyPatientQuery(trimmed: string): QueryClassification {
  const isNumericAttempt = /^\d+$/.test(trimmed)
  const isMobileQuery = isNumericAttempt && trimmed.length >= 6

  const isCompleteCode = /^pat-?\d{6,}$/i.test(trimmed)
  const isIncompleteCodeAttempt = /^pat-\d*$/i.test(trimmed) || /^pat\d{1,5}$/i.test(trimmed)

  const isNameQuery = !isNumericAttempt && !isCompleteCode && !isIncompleteCodeAttempt

  const hasSearchableQuery = isMobileQuery || isCompleteCode || (isNameQuery && trimmed.length >= 3)

  return { isMobileQuery, isCompleteCode, isNameQuery, hasSearchableQuery }
}

function buildSearchQuery(trimmed: string, classification: QueryClassification): SearchPatientQuery {
  if (classification.isMobileQuery) return { mobile: trimmed }
  if (classification.isCompleteCode) return { code: trimmed }
  return { name: trimmed }
}

// queryKey fully encodes the search params, so a query-shape change is
// naturally a fresh key with its own fresh pagination — no manual reset needed.
export const usePatientPicker = (query: string, enabled: boolean) => {
  const debouncedQuery = useDebouncedValue(query, 300)

  const trimmedRaw = query.trim()
  const trimmedDebounced = debouncedQuery.trim()

  // Plain text comparison, not classification — "Ramesh" and "Rajesh" share a
  // classification but are not the same query.
  const isDebouncing = trimmedRaw !== trimmedDebounced

  // Off the RAW query so guidance feedback reacts instantly, not 300ms late.
  const rawClassification = classifyPatientQuery(trimmedRaw)
  const debouncedClassification = classifyPatientQuery(trimmedDebounced)

  const searchQuery = buildSearchQuery(trimmedDebounced, debouncedClassification)
  const queryEnabled = enabled && debouncedClassification.hasSearchableQuery

  const {
    data,
    isFetching: rawIsFetching,
    isFetchingNextPage: rawIsFetchingNextPage,
    error: rawError,
    hasNextPage: rawHasNextPage,
    fetchNextPage: rawFetchNextPage,
    isFetched,
    refetch,
  } = useInfiniteQuery<
    PaginatedResponse<PatientEntity>,
    Error,
    InfiniteData<PaginatedResponse<PatientEntity>>,
    QueryKey,
    number
  >({
    queryKey: [...patientKeys.list({ ...searchQuery, limit: String(PAGE_SIZE) } as SearchPatientQuery)],
    queryFn: ({ pageParam }) =>
      patientService.searchPatients({ ...searchQuery, page: String(pageParam), limit: String(PAGE_SIZE) }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      allPages.flatMap((p) => p.data?.items ?? []).length < (lastPage.data?.count ?? 0) ? allPages.length + 1 : undefined,
    enabled: queryEnabled,
  })

  const rawItems = data?.pages.flatMap((p) => p.data?.items ?? []) ?? []

  // Suppress pagination too while debouncing — otherwise "Load more" could
  // survive into the new query and fetch a page of the stale search.
  const items = isDebouncing ? [] : rawItems
  const error = isDebouncing ? null : rawError
  const hasNextPage = !isDebouncing && !!rawHasNextPage
  const isFetchingNextPage = !isDebouncing && rawIsFetchingNextPage
  const fetchNextPage = () => {
    if (!isDebouncing && rawHasNextPage) return rawFetchNextPage()
  }

  return {
    items,
    isFetching: rawIsFetching,
    isFetchingNextPage,
    error,
    hasNextPage,
    fetchNextPage,
    isFetched,
    refetch,
    isDebouncing,
    hasSearchableQuery: rawClassification.hasSearchableQuery,
    isNameQuery: rawClassification.isNameQuery,
  }
}

export { classifyPatientQuery }
