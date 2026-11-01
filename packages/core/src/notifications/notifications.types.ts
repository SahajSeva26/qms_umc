// Mirrors GET /notifications/me and PATCH /notifications/me/read.

export type NotificationChannel = 'email' | 'in-app' | 'whatsapp' | 'sms'
export type NotificationStatus = 'pending' | 'sent' | 'failed'

export interface NotificationEntity {
  id: string
  type: string
  event: string
}

export interface NotificationEntityItem {
  id: string
  entity: NotificationEntity | null
  event: string
  channel: NotificationChannel
  subject?: string
  body?: string
  status: NotificationStatus
  sentAt: string | null
  read: boolean
  readAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SearchNotificationQuery {
  page?: string
  limit?: string
  read?: 'true' | 'false'
  channel?: NotificationChannel
}

export interface MarkAllReadResponse {
  modified: number
}

// Matches PaginatedResponse<NotificationEntityItem>, named locally for useInfiniteQuery's generics.
export interface PaginatedNotificationsResponse {
  success: boolean
  message: string
  data: {
    count: number
    items: NotificationEntityItem[]
  } | null
}
