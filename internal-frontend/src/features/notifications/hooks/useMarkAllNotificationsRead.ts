import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsService } from '@/features/notifications/notifications.service'

// No per-id endpoint exists — marks every unread notification read in one call.
const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-feed'] })
    },
  })
}

export default useMarkAllNotificationsRead
