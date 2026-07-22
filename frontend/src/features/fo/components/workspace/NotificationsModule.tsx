import {
  FiHome, FiFileText, FiCalendar, FiAlertTriangle, FiPackage, FiAward, FiBell,
} from 'react-icons/fi'
import type { IconType } from 'react-icons'
import type { Person } from '@/types/people.types'
import type { FoNotification } from '@/features/fo/fo.types'
import { Button } from '@/components/ui/button'

interface NotificationsModuleProps {
  me: Person
  notifications: FoNotification[]
  unreadCount: number
  onMarkAllRead: () => void
}

const ICON_MAP: Record<string, IconType> = {
  FiHome, FiFileText, FiCalendar, FiAlertTriangle, FiPackage, FiAward,
}

const PRIORITY_STYLE: Record<FoNotification['priority'], { bg: string; color: string }> = {
  urgent: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
  high: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  med: { bg: 'rgba(59,109,255,.12)', color: 'var(--qms-brand)' },
  low: { bg: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' },
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

const NotificationsModule = ({ notifications, unreadCount, onMarkAllRead }: NotificationsModuleProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          {unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'All caught up'}
        </div>
        <Button size="sm" variant="outline" onClick={onMarkAllRead} disabled={unreadCount === 0}>Mark all read</Button>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div>
          {notifications.map((n) => {
            const Icon = ICON_MAP[n.icon] ?? FiBell
            const style = PRIORITY_STYLE[n.priority]
            const isUnread = !n.readAt
            return (
              <div
                key={n.id}
                className="flex items-start gap-3 px-3.5 py-3 border-t first:border-t-0"
                style={{ borderColor: 'var(--qms-border)', background: isUnread ? 'color-mix(in oklab, var(--qms-brand) 4%, transparent)' : 'transparent' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: style.bg, color: style.color }}>
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate text-[13px]" style={{ color: 'var(--qms-text)' }}>{n.title}</div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{n.body}</div>
                  <div className="text-[10.5px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>{formatWhen(n.at)}</div>
                </div>
                <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0" style={{ background: style.bg, color: style.color }}>{n.priority}</span>
              </div>
            )
          })}
          {notifications.length === 0 && (
            <div className="text-center py-10 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No notifications.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationsModule
