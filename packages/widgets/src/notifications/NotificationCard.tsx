import { FiBell } from 'react-icons/fi'
import { formatRelativeTime, type NotificationEntityItem } from '@qms/core'
import type { EntityResolution } from './notifications.entityResolver'

interface NotificationCardProps {
  notification: NotificationEntityItem
  /** Already app-configured (icon/label/href per entity type, permission/role gated) — built via
   * @qms/core's createNotificationEntityResolver. Pass the bound function, not the factory. */
  resolveEntity: (entity: NotificationEntityItem['entity'], roleTypeCode?: string | null, hasAnyPermission?: (codes: string[]) => boolean) => EntityResolution | null
  roleTypeCode?: string | null
  hasAnyPermission?: (codes: string[]) => boolean
  onNavigate: (href: string) => void
  /** 'full' (the drawer) shows the untruncated body, an absolute timestamp, and an entity-type
   * label — the popover's 'compact' (default) clips both to keep the list short. */
  variant?: 'compact' | 'full'
}

function formatAbsoluteTime(isoDate: string): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Unresolved entity types render inert — readable, but not clickable. This is the one shared row
// component both apps' NotificationBell/NotificationsDrawer render; navigation itself is always
// delegated to the caller via onNavigate(href) — this component never imports a router.
const NotificationCard = ({ notification, resolveEntity, roleTypeCode, hasAnyPermission, onNavigate, variant = 'compact' }: NotificationCardProps) => {
  const resolution = resolveEntity(notification.entity, roleTypeCode, hasAnyPermission)
  const Icon = resolution?.icon ?? FiBell
  const isFull = variant === 'full'

  const content = (
    <div className={`flex gap-2.5 ${isFull ? 'px-4 py-3' : 'min-h-[68px] px-3 py-2.5'}`}>
      <div
        className={`rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isFull ? 'w-9 h-9' : 'w-8 h-8'}`}
        style={{ background: 'var(--qms-surface-card)', color: 'var(--qms-text-muted)' }}
      >
        <Icon size={isFull ? 16 : 14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div
            className={`text-[13px] font-bold leading-snug ${isFull ? '' : 'line-clamp-2'}`}
            style={{ color: 'var(--qms-text)' }}
          >
            {notification.subject || 'Notification'}
          </div>
          {!notification.read && (
            <span
              className="w-2 h-2 rounded-full shrink-0 mt-1.5"
              style={{ backgroundColor: 'var(--qms-role-super-admin)' }}
              aria-label="Unread"
            />
          )}
        </div>
        {notification.body && (
          <div
            className={`text-[12px] mt-0.5 ${isFull ? '' : 'line-clamp-2'}`}
            style={{ color: 'var(--qms-text-muted)' }}
          >
            {notification.body}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
          <span>{isFull ? formatAbsoluteTime(notification.createdAt) : formatRelativeTime(notification.createdAt)}</span>
          {isFull && resolution && (
            <>
              <span aria-hidden>&middot;</span>
              <span className="font-semibold" style={{ color: 'var(--qms-text-soft)' }}>{resolution.label}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )

  if (!resolution) {
    return (
      <div className="border-b last:border-b-0" style={{ borderColor: 'var(--qms-border)' }}>
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate(resolution.href(notification.entity!.id))}
      className="w-full text-left border-b last:border-b-0 transition-all hover:bg-(--qms-surface-hover)"
      style={{ borderColor: 'var(--qms-border)' }}
    >
      {content}
    </button>
  )
}

export default NotificationCard
