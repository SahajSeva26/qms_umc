import { useEntityQuery } from '@/hooks/useEntityQuery'
import { notificationsService } from '@/features/notifications/notifications.service'
import { EMPTY_ARRAY } from '@/utils/emptyArray'
import type { NotificationEntityItem, SearchNotificationQuery } from '@/features/notifications/notifications.types'

// Paged (not infinite) feed for the drawer — mark-all-read's invalidateQueries on the
// ['notifications-feed'] key below refetches whatever page is currently showing.
export const notificationsPageKey = 'notifications-feed'

const useNotificationsPage = (query: SearchNotificationQuery, enabled = true) => {
  const { data, isLoading, isFetching, error, refetch } = useEntityQuery(
    notificationsPageKey,
    notificationsService.getMyNotifications,
    query,
    { enabled, keepPreviousData: true },
  )

  return {
    items: data?.data?.items ?? EMPTY_ARRAY,
    count: data?.data?.count ?? 0,
    isLoading: isLoading || (isFetching && !data),
    isFetching,
    error,
    refetch,
  }
}

export default useNotificationsPage
export type { NotificationEntityItem }
