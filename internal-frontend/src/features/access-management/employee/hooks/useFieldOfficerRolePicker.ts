import { useInfiniteQuery, type InfiniteData, type QueryKey } from '@tanstack/react-query'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { RoleEntity, SearchRoleQuery } from '@/types/accessManagement.types'
import type { PaginatedResponse } from '@/types/common.types'

const PAGE_SIZE = 10
const MIN_SEARCH_LENGTH = 2

// Its OWN root key, never shared with roleKeys.all's root — mixing this useInfiniteQuery's
// InfiniteData<TData> cache shape into a plain useQuery's namespace would corrupt both.
const PICKER_KEY_ROOT = 'employee-fo-role-picker'

export const useFieldOfficerRolePicker = (search: string, tenant: string | undefined, type: string | undefined, enabled: boolean) => {
  const debouncedSearch = useDebouncedValue(search, 300)

  const trimmedRaw = search.trim()
  const trimmedDebounced = debouncedSearch.trim()
  const isDebouncing = trimmedRaw !== trimmedDebounced

  const hasSearchableQuery = trimmedDebounced.length >= MIN_SEARCH_LENGTH
  const queryEnabled = enabled && !!tenant && !!type && hasSearchableQuery

  const searchQuery: SearchRoleQuery = { tenant, type, status: 'active', user: trimmedDebounced }

  const {
    data,
    isFetching: rawIsFetching,
    isFetchingNextPage: rawIsFetchingNextPage,
    error: rawError,
    hasNextPage: rawHasNextPage,
    fetchNextPage: rawFetchNextPage,
  } = useInfiniteQuery<PaginatedResponse<RoleEntity>, Error, InfiniteData<PaginatedResponse<RoleEntity>>, QueryKey, number>({
    queryKey: [PICKER_KEY_ROOT, tenant, type, trimmedDebounced],
    queryFn: ({ pageParam }) =>
      accessManagementService.searchRoles({ ...searchQuery, page: String(pageParam), limit: String(PAGE_SIZE) }),
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
    isDebouncing,
    hasSearchableQuery,
  }
}
