import { useEffect } from 'react'
import type { AxiosInstance } from 'axios'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import {
  useUnreadNotificationCount,
  useNotificationFeed,
  useMarkAllNotificationsRead,
  type NotificationEntityItem,
} from '@qms/core'
import { Button } from '@qms/ui'
import type { EntityResolution } from './notifications.entityResolver'
import NotificationCard from './NotificationCard'
import NotificationsDrawer from './NotificationsDrawer'

export interface NotificationBellPopoverProps {
  api: AxiosInstance
  open: boolean
  onOpenChange: (open: boolean) => void
  anchor: HTMLElement | null
  resolveEntity: (entity: NotificationEntityItem['entity'], roleTypeCode?: string | null, hasAnyPermission?: (codes: string[]) => boolean) => EntityResolution | null
  roleTypeCode?: string | null
  hasAnyPermission?: (codes: string[]) => boolean
  /** Called with the resolved entity's href — the app does its own router navigation. */
  onNavigate: (href: string) => void
  /** Controls the "View all" drawer, owned by the caller so it can lazy-mount this on first open
   * the same way the popover itself is lazy-mounted on first bell click. */
  drawerOpen: boolean
  onDrawerOpenChange: (open: boolean) => void
}

// The heavy half of the notification bell — real @base-ui/react/popover (focus-safe, Escape-to-
// close) with the paginated feed, mark-all-read, and (via NotificationsDrawer) the full "View all"
// view. Lazy-loaded by the app only once NotificationBellTrigger is clicked; this component is
// never mounted before that, so none of its @base-ui/react/dialog+popover weight is paid upfront.
const NotificationBellPopover = ({
  api,
  open,
  onOpenChange,
  anchor,
  resolveEntity,
  roleTypeCode,
  hasAnyPermission,
  onNavigate,
  drawerOpen,
  onDrawerOpenChange,
}: NotificationBellPopoverProps) => {
  const { count, error: countError, refetch: refetchCount } = useUnreadNotificationCount(api)
  const feed = useNotificationFeed(api, open)
  const markAllRead = useMarkAllNotificationsRead(api)

  // Re-validates the badge AND the feed on open — the feed's query cache (5min default
  // staleTime) would otherwise show stale content under a badge that's already gone red for a
  // notification that arrived while the popover was closed.
  useEffect(() => {
    if (open) {
      refetchCount()
      feed.refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, refetchCount])

  return (
    <>
      <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner anchor={anchor} side="bottom" align="end" sideOffset={8}>
            <PopoverPrimitive.Popup
              aria-label="Notifications"
              className="w-80 max-h-[70vh] flex flex-col overflow-hidden rounded-xl border shadow-xl backdrop-blur-xl outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
              style={{ borderColor: 'var(--qms-border)', backgroundColor: 'var(--popover)' }}
            >
              <div
                className="flex items-center justify-between px-3 py-2.5 shrink-0"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>Notifications</div>
                {/* Shown if the count is known-positive OR the loaded feed has unread cards. */}
                {(!countError && count > 0) || feed.items.some((item) => !item.read) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-auto py-1"
                    disabled={markAllRead.isPending}
                    onClick={() => markAllRead.mutate()}
                  >
                    Mark all read
                  </Button>
                ) : null}
              </div>

              {countError && (
                <div className="text-[11px] px-3 py-2 bg-danger-soft border-b border-danger text-danger shrink-0">
                  Unread count unavailable — some notifications may be unread.
                </div>
              )}

              {markAllRead.isError && (
                <div className="flex items-center justify-between gap-2 text-[11px] px-3 py-2 bg-danger-soft border-b border-danger text-danger shrink-0">
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

              <div className="overflow-y-auto flex-1">
                {feed.isLoading ? (
                  <div className="text-[12px] py-8 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
                ) : feed.error ? (
                  <div className="flex items-center justify-between gap-3 text-[12px] px-3 py-2 bg-danger-soft border border-danger text-danger m-2 rounded-lg">
                    <span>Failed to load notifications.</span>
                    <Button variant="outline" size="sm" onClick={() => feed.refetch()} className="shrink-0">Retry</Button>
                  </div>
                ) : feed.items.length === 0 ? (
                  <div className="text-[12px] py-8 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                    No notifications yet.
                  </div>
                ) : (
                  <>
                    {feed.items.map((item) => (
                      <NotificationCard
                        key={item.id}
                        notification={item}
                        resolveEntity={resolveEntity}
                        roleTypeCode={roleTypeCode}
                        hasAnyPermission={hasAnyPermission}
                        onNavigate={(href) => { onOpenChange(false); onNavigate(href) }}
                      />
                    ))}
                    {feed.isFetchNextPageError ? (
                      <div className="flex items-center justify-between gap-2 text-[11px] px-3 py-2 bg-danger-soft border-t border-danger text-danger">
                        <span>Couldn't load more.</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto py-0.5 px-2 text-[11px] shrink-0"
                          onClick={() => feed.loadMore()}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : (
                      feed.hasMore && (
                        <div className="p-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-[12px]"
                            disabled={feed.isFetchingNextPage}
                            onClick={() => feed.loadMore()}
                          >
                            {feed.isFetchingNextPage ? 'Loading…' : 'Load more'}
                          </Button>
                        </div>
                      )
                    )}
                  </>
                )}
              </div>

              <div className="px-3 py-2 shrink-0" style={{ borderTop: '1px solid var(--qms-border)' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-[12px]"
                  onClick={() => {
                    onOpenChange(false)
                    onDrawerOpenChange(true)
                  }}
                >
                  View all
                </Button>
              </div>
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      <NotificationsDrawer
        api={api}
        open={drawerOpen}
        onClose={() => onDrawerOpenChange(false)}
        resolveEntity={resolveEntity}
        roleTypeCode={roleTypeCode}
        hasAnyPermission={hasAnyPermission}
        onNavigate={onNavigate}
      />
    </>
  )
}

export default NotificationBellPopover
