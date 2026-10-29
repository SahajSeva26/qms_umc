export type { ApiResponse, PaginatedResponse } from './common.types'
export type { LocationValue } from './location.types'
export { createEmptyLocationValue } from './location.types'
export type {
  TenantType,
  SessionUser,
  SessionRole,
  SessionRoleType,
  SessionTenant,
  SessionResponse,
  SessionPermissions,
} from './session.types'
export { AuthMeResponseSchema } from './session.schema'
export { getMe } from './getMe'
export { validateApiResponse } from './validateApiResponse'
export { reportApiContractMismatch } from './reportApiContractMismatch'

export {
  createDoctorFormSchemaFor,
  editDoctorFormSchemaFor,
  emptyCreateDoctorFormValues,
  toCreateDoctorPayload,
  toUpdateDoctorPayload,
  fromDoctorEntity,
} from './doctorForm'
export type {
  CreateDoctorFormValues,
  EditDoctorFormValues,
  DoctorLocationLike,
  DoctorCreateScopeValue,
} from './doctorForm'

export type {
  NotificationChannel,
  NotificationStatus,
  NotificationEntity,
  NotificationEntityItem,
  SearchNotificationQuery,
  MarkAllReadResponse,
  PaginatedNotificationsResponse,
} from './notifications/notifications.types'
export { getMyNotifications, markAllNotificationsRead } from './notifications/notifications.service'
export { formatRelativeTime } from './notifications/notifications.formatters'
// createNotificationEntityResolver / EntityResolution live in @qms/widgets, not here — that type
// carries a react-icons IconType (a presentation concern), and this package stays limited to
// transport/query contracts.
export { unreadNotificationCountKey, useUnreadNotificationCount } from './notifications/hooks/useUnreadNotificationCount'
export { notificationFeedKey, useNotificationFeed } from './notifications/hooks/useNotificationFeed'
export { useMarkAllNotificationsRead } from './notifications/hooks/useMarkAllNotificationsRead'
export { useNotificationsPage } from './notifications/hooks/useNotificationsPage'

export type {
  RatingPopulatedCamp,
  RatingPopulatedRole,
  RatingPopulatedTenant,
  RatingEntity,
  CreateRatingPayload,
  UpdateRatingPayload,
  SearchRatingQuery,
} from './rating/rating.types'
export { searchRatings, myRatings, getRating, createRating, updateRating } from './rating/rating.service'
export { RATING_GROUNDS } from './rating/rating.constants'
export type { RatingGroundKey } from './rating/rating.constants'
export { useRatings } from './rating/hooks/useRatings'
export { useMyRatings } from './rating/hooks/useMyRatings'
export { useRateCamp } from './rating/hooks/useRateCamp'
export type { UseRateCampDeps } from './rating/hooks/useRateCamp'
