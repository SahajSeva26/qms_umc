import type { AxiosInstance } from 'axios'
import { useInfiniteQuery, type InfiniteData, type QueryKey } from '@tanstack/react-query'
import { getMyNotifications } from '../notifications.service'
import type { NotificationEntityItem, PaginatedNotificationsResponse } from '../notifications.types'

const PAGE_SIZE = 10

// Stable empty-array reference — a literal `?? []` fallback creates a new array every render,
// defeating any caller's useMemo/useCallback deps on `items`. Self-contained here rather than
// depending on either app's own utils/emptyArray.ts.
const EMPTY_ITEMS: NotificationEntityItem[] = []

// Paginated feed for the bell popover. useInfiniteQuery refetches every fetched page together
// on invalidation, so mark-all-read's invalidateQueries updates page 1 and page 2+ coherently.
export const notificationFeedKey = ['notifications-feed'] as const

export function useNotificationFeed(api: AxiosInstance, enabled: boolean) {
  const {
    data,
    isFetching,
    isFetchingNextPage,
    error,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<PaginatedNotificationsResponse, Error, InfiniteData<PaginatedNotificationsResponse>, QueryKey, number>({
    queryKey: notificationFeedKey,
    queryFn: ({ pageParam }) => getMyNotifications(api, { page: String(pageParam), limit: String(PAGE_SIZE) }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loadedSoFar = allPages.reduce((sum, p) => sum + (p.data?.items.length ?? 0), 0)
      const totalCount = lastPage.data?.count ?? 0
      return loadedSoFar < totalCount ? allPages.length + 1 : undefined
    },
    enabled,
  })

  const items: NotificationEntityItem[] = data?.pages.flatMap((p) => p.data?.items ?? EMPTY_ITEMS) ?? EMPTY_ITEMS
  const count = data?.pages.at(-1)?.data?.count ?? 0

  return {
    items,
    count,
    hasMore: !!hasNextPage,
    // isFetching, not isLoading — isLoading misses a refetch (e.g. after mark-all-read).
    isLoading: isFetching && !isFetchingNextPage,
    isFetching: isFetching && !isFetchingNextPage,
    // Reflects only the initial load; a failed loadMore is isFetchNextPageError instead.
    error: isFetchNextPageError ? null : error,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
    loadMore: fetchNextPage,
  }
}
