import { useQuery } from '@tanstack/react-query'
import { notificationsService } from '@/features/notifications/notifications.service'

// Badge-only count, fetched regardless of whether the bell is opened.
const useUnreadNotificationCount = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.getMyNotifications({ read: 'false', limit: '1' }),
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

export default useUnreadNotificationCount
