import { forwardRef } from 'react'
import type { AxiosInstance } from 'axios'
import { FiBell } from 'react-icons/fi'
import { useUnreadNotificationCount } from '@qms/core'

export interface NotificationBellTriggerProps {
  /** The CALLING app's own configured axios instance — same convention as @qms/core's getMe(api). */
  api: AxiosInstance
  open: boolean
  onClick: () => void
}

// Eager, lightweight — the bell icon and its unread badge, backed only by
// useUnreadNotificationCount (a single limit=1 query, 60s poll). No @base-ui/react dependency, so
// this never pulls in the popover/dialog/feed/drawer bundle: that's NotificationBellPopover,
// lazy-loaded by the app only once this trigger is actually clicked. The trigger stays mounted and
// responsive the whole time that chunk is loading — there is no "missing bell" state.
const NotificationBellTrigger = forwardRef<HTMLButtonElement, NotificationBellTriggerProps>(
  ({ api, open, onClick }, ref) => {
    const { count, error: countError } = useUnreadNotificationCount(api)

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all"
        style={{ color: 'var(--qms-text-soft)' }}
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <FiBell size={16} />
        {countError ? (
          // Unknown (request failed), not confirmed zero.
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-qms-surface"
            style={{ backgroundColor: 'var(--qms-text-muted)' }}
            aria-label="Unread count unavailable"
          />
        ) : (
          count > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-qms-surface"
              style={{ backgroundColor: 'var(--qms-role-super-admin)' }}
            />
          )
        )}
      </button>
    )
  },
)
NotificationBellTrigger.displayName = 'NotificationBellTrigger'

export default NotificationBellTrigger
