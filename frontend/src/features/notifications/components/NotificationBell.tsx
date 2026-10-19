import { useEffect, useState } from 'react'
import { FiBell } from 'react-icons/fi'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import NotificationCard from '@/features/notifications/components/NotificationCard'
import useUnreadNotificationCount from '@/features/notifications/hooks/useUnreadNotificationCount'
import useNotificationFeed from '@/features/notifications/hooks/useNotificationFeed'
import useMarkAllNotificationsRead from '@/features/notifications/hooks/useMarkAllNotificationsRead'

const NotificationBell = () => {
  const [open, setOpen] = useState(false)
  const { count, error: countError, refetch: refetchCount } = useUnreadNotificationCount()
  const feed = useNotificationFeed(open)
  const markAllRead = useMarkAllNotificationsRead()

  // Re-validates the badge on open so it can't disagree with the freshly-loaded feed.
  useEffect(() => {
    if (open) refetchCount()
  }, [open, refetchCount])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all"
        style={{ color: 'var(--qms-text-soft)' }}
        aria-label="Notifications"
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
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 max-h-[70vh] flex flex-col p-0 overflow-hidden">
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
          <div
            className="text-[11px] px-3 py-2 bg-danger-soft border-b border-danger text-danger shrink-0"
          >
            Unread count unavailable — some notifications may be unread.
          </div>
        )}

        {markAllRead.isError && (
          <div
            className="flex items-center justify-between gap-2 text-[11px] px-3 py-2 bg-danger-soft border-b border-danger text-danger shrink-0"
          >
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
          <QueryStateBlock
            isLoading={feed.isLoading}
            error={feed.error}
            loadingLabel="Loading…"
            errorLabel="Failed to load notifications."
            onRetry={feed.refetch}
          >
            {feed.items.length === 0 ? (
              <div className="text-[12px] py-8 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                No notifications yet.
              </div>
            ) : (
              <>
                {feed.items.map((item) => (
                  <NotificationCard key={item.id} notification={item} onNavigate={() => setOpen(false)} />
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
          </QueryStateBlock>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationBell
