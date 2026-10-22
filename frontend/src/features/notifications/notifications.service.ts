import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type { MarkAllReadResponse, NotificationEntityItem, SearchNotificationQuery } from '@/features/notifications/notifications.types'

// channel is pinned to 'in-app' server-side for /me regardless of what's sent.
const getMyNotifications = async (query: SearchNotificationQuery) => {
  const res = await api.get<PaginatedResponse<NotificationEntityItem>>('/notifications/me', { params: query })
  return res.data
}

const markAllRead = async () => {
  const res = await api.patch<ApiResponse<MarkAllReadResponse>>('/notifications/me/read')
  return res.data
}

export const notificationsService = {
  getMyNotifications,
  markAllRead,
}
