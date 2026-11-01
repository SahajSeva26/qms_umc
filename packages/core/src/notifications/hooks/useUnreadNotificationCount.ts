import type { AxiosInstance } from 'axios'
import { useQuery } from '@tanstack/react-query'
import { getMyNotifications } from '../notifications.service'

export const unreadNotificationCountKey = ['notifications', 'unread-count'] as const

// Badge-only count, fetched regardless of whether the bell is opened — kept lightweight (a single
// query, limit=1) and eager so the badge never waits on the feed/drawer being opened first.
export function useUnreadNotificationCount(api: AxiosInstance) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: unreadNotificationCountKey,
    queryFn: () => getMyNotifications(api, { read: 'false', limit: '1' }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  return {
    count: data?.data?.count ?? 0,
    isLoading,
    error,
    // Lets the bell force a fresh check the instant the popover opens.
    refetch,
  }
}
