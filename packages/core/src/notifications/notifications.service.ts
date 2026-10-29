import type { AxiosInstance } from 'axios'
import type { ApiResponse, PaginatedResponse } from '../common.types'
import type { MarkAllReadResponse, NotificationEntityItem, SearchNotificationQuery } from './notifications.types'

// GET /notifications/me — channel is pinned to 'in-app' server-side regardless of what's sent.
// Takes the CALLING app's own configured axios instance, same convention as getMe.ts, so this
// package stays independent of either app's API client configuration.
export async function getMyNotifications(api: AxiosInstance, query: SearchNotificationQuery) {
  const res = await api.get<PaginatedResponse<NotificationEntityItem>>('/notifications/me', { params: query })
  return res.data
}

// PATCH /notifications/me/read — no body, no id. Marks every unread in-app notification for the
// caller as read in one call; there is no per-notification read endpoint.
export async function markAllNotificationsRead(api: AxiosInstance) {
  const res = await api.patch<ApiResponse<MarkAllReadResponse>>('/notifications/me/read')
  return res.data
}
