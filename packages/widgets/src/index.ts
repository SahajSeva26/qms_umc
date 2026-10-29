// Eager — no @base-ui/react dependency (just the bell icon + a single lightweight
// useUnreadNotificationCount query from @qms/core), so it's safe in this always-bundled barrel.
export { default as NotificationBellTrigger } from './notifications/NotificationBellTrigger'
export type { NotificationBellTriggerProps } from './notifications/NotificationBellTrigger'

// Plain functions/types, no @base-ui/react dependency — each app builds its own config (entity
// whitelist, permission gates) and passes the bound resolver to NotificationCard/
// NotificationBellPopover/NotificationsDrawer below.
export { createNotificationEntityResolver } from './notifications/notifications.entityResolver'
export type { EntityResolution, EntityResolverConfig } from './notifications/notifications.entityResolver'

// The open/mounted/drawer/ref state machine every Topbar needs around the trigger+popover pair —
// shared so the two apps' copies can't drift (no @base-ui/react dependency, safe here).
export { useNotificationBellState } from './notifications/useNotificationBellState'

// CampRatingSection itself is eager (it must render to decide whether to show anything at all),
// but its own heavy half (RateCampModal, @base-ui/react/dialog + the rating form) is lazy-loaded
// internally via React.lazy, mounted only once a viewer actually opens the rate/edit form — same
// Trigger/Popover-style split as notifications, just both halves living in one file since
// CampRatingSection's own "trigger" render is tiny (a read-only display or a single button).
export { default as CampRatingSection } from './rating/CampRatingSection'
export type { CampRatingSectionProps, CampRatingAccess } from './rating/CampRatingSection'
export { default as RatingDisplay } from './rating/RatingDisplay'

// NotificationBellPopover (and the NotificationsDrawer/NotificationCard it owns internally) are
// deliberately NOT re-exported from this barrel: they pull in @base-ui/react/dialog + /popover,
// which nothing else in this barrel's eager export set uses. Statically re-exporting them here
// would mean every consumer that eagerly imports anything from @qms/widgets bundles both
// primitives whether or not they ever open the notification popover — confirmed via a real Vite
// build that a component is NOT chunk-isolated merely because its OWN consumer wraps it in
// React.lazy, if the module is ALSO reachable through an eagerly-imported barrel. Each app
// lazy-imports the popover directly by its own module path instead, only once
// NotificationBellTrigger is actually clicked:
//   lazy(() => import('@qms/widgets/notifications/NotificationBellPopover'))
// See package.json's "exports" map for the subpath.
