import type { AxiosInstance } from 'axios'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getMyNotifications } from '../notifications.service'
import type { NotificationEntityItem, SearchNotificationQuery } from '../notifications.types'

const EMPTY_ITEMS: NotificationEntityItem[] = []

// Paged (not infinite) feed for the drawer — mark-all-read's invalidateQueries on the
// ['notifications-feed', query] key below refetches whatever page is currently showing.
export function useNotificationsPage(api: AxiosInstance, query: SearchNotificationQuery, enabled = true) {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['notifications-feed', query],
    queryFn: () => getMyNotifications(api, query),
    enabled,
    placeholderData: keepPreviousData,
  })

  return {
    items: data?.data?.items ?? EMPTY_ITEMS,
    count: data?.data?.count ?? 0,
    isLoading: isLoading || (isFetching && !data),
    isFetching,
    error,
    refetch,
  }
}
