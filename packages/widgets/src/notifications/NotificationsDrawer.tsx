import { useState } from 'react'
import type { AxiosInstance } from 'axios'
import { FiX } from 'react-icons/fi'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import {
  useNotificationsPage,
  useMarkAllNotificationsRead,
  useUnreadNotificationCount,
  type NotificationEntityItem,
} from '@qms/core'
import { Button } from '@qms/ui'
import type { EntityResolution } from './notifications.entityResolver'
import NotificationCard from './NotificationCard'

const PAGE_SIZE = 10

export interface NotificationsDrawerProps {
  api: AxiosInstance
  open: boolean
  onClose: () => void
  resolveEntity: (entity: NotificationEntityItem['entity'], roleTypeCode?: string | null, hasAnyPermission?: (codes: string[]) => boolean) => EntityResolution | null
  roleTypeCode?: string | null
  hasAnyPermission?: (codes: string[]) => boolean
  onNavigate: (href: string) => void
}

type ReadFilter = 'all' | 'unread'

// Full "View all" side drawer — classic page/filter UI, independent of the popover's own feed
// query. Built directly on @base-ui/react/dialog (real focus trap, Escape-to-close) rather than
// depending on either app's own SideDrawer wrapper, keeping this component self-contained.
const NotificationsDrawer = ({ api, open, onClose, resolveEntity, roleTypeCode, hasAnyPermission, onNavigate }: NotificationsDrawerProps) => {
  const [filter, setFilter] = useState<ReadFilter>('all')
  const [page, setPage] = useState(1)
  const markAllRead = useMarkAllNotificationsRead(api)
  // `count` from useNotificationsPage is the filtered total (on "All" it includes already-read
  // rows), not what "Mark all read" acts on — gate on the unread count instead. An unknown count
  // (query failed) must not read as "confirmed zero", so it doesn't disable the button on its own.
  const { count: unreadCount, error: unreadCountError } = useUnreadNotificationCount(api)

  const { items, count, isLoading, isFetching, error, refetch } = useNotificationsPage(
    api,
    {
      page: String(page),
      limit: String(PAGE_SIZE),
      read: filter === 'unread' ? 'false' : undefined,
    },
    open,
  )

  const changeFilter = (next: ReadFilter) => {
    if (next === filter) return
    setFilter(next)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className="fixed inset-y-0 right-0 z-50 w-full max-w-lg flex flex-col shadow-2xl outline-none duration-150 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
          style={{ background: 'var(--qms-surface-card)', borderLeft: '1px solid var(--qms-border)', backdropFilter: 'blur(20px) saturate(140%)' }}
        >
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--qms-border)' }}>
            <DialogPrimitive.Title className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
              Notifications
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-(--qms-surface-hover)"
              style={{ color: 'var(--qms-text-muted)' }}
              aria-label="Close"
            >
              <FiX size={16} />
            </DialogPrimitive.Close>
          </div>

          <div className="flex items-center justify-between gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--qms-border)' }}>
            <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: 'var(--qms-border)' }}>
              <button
                type="button"
                onClick={() => changeFilter('all')}
                className="px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors"
                style={filter === 'all' ? { background: 'var(--qms-brand)', color: 'white' } : { color: 'var(--qms-text-soft)' }}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => changeFilter('unread')}
                className="px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors"
                style={filter === 'unread' ? { background: 'var(--qms-brand)', color: 'white' } : { color: 'var(--qms-text-soft)' }}
              >
                Unread
              </button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="text-[12px] shrink-0"
              disabled={markAllRead.isPending || (!unreadCountError && unreadCount === 0)}
              onClick={() => markAllRead.mutate()}
            >
              {markAllRead.isPending ? 'Marking…' : 'Mark all read'}
            </Button>
          </div>

          {markAllRead.isError && (
            <div className="flex items-center justify-between gap-2 text-[12px] px-5 py-2 bg-danger-soft border-b border-danger text-danger shrink-0">
              <span>Failed to mark notifications as read.</span>
              <Button
                variant="outline"
                size="sm"
                className="h-auto py-0.5 px-2 text-[11px] shrink-0"
                onClick={() => markAllRead.mutate()}
              >
                Retry
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5">
            {isLoading ? (
              <div className="text-[13px] py-12 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading notifications…</div>
            ) : error ? (
              <div className="flex items-center justify-between gap-3 text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger my-3">
                <span>Failed to load notifications.</span>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0">Retry</Button>
              </div>
            ) : items.length === 0 ? (
              <div className="text-[13px] py-12 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
              </div>
            ) : (
              <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                {items.map((item) => (
                  <NotificationCard
                    key={item.id}
                    notification={item}
                    resolveEntity={resolveEntity}
                    roleTypeCode={roleTypeCode}
                    hasAnyPermission={hasAnyPermission}
                    onNavigate={(href) => { onClose(); onNavigate(href) }}
                    variant="full"
                  />
                ))}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderTop: '1px solid var(--qms-border)' }}>
              <span className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={isFetching || page <= 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={isFetching || page >= totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export default NotificationsDrawer
