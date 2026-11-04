import type { AxiosInstance } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { markAllNotificationsRead } from '../notifications.service'

// No per-id endpoint exists — marks every unread notification read in one call.
export function useMarkAllNotificationsRead(api: AxiosInstance) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markAllNotificationsRead(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-feed'] })
    },
  })
}
