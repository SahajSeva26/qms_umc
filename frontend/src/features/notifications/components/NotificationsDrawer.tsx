import { useState } from 'react'
import SideDrawer from '@/components/ui/SideDrawer'
import { SegRow, SegButton } from '@/components/ui/SegButton'
import { Button } from '@/components/ui/button'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePagination } from '@/hooks/usePagination'
import NotificationCard from '@/features/notifications/components/NotificationCard'
import useNotificationsPage from '@/features/notifications/hooks/useNotificationsPage'
import useMarkAllNotificationsRead from '@/features/notifications/hooks/useMarkAllNotificationsRead'
import useUnreadNotificationCount from '@/features/notifications/hooks/useUnreadNotificationCount'

const PAGE_SIZE = 10

interface NotificationsDrawerProps {
  open: boolean
  onClose: () => void
}

type ReadFilter = 'all' | 'unread'

const NotificationsDrawer = ({ open, onClose }: NotificationsDrawerProps) => {
  const [filter, setFilter] = useState<ReadFilter>('all')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const markAllRead = useMarkAllNotificationsRead()
  // `count` from useNotificationsPage is the filtered total (on "All" it includes already-read
  // rows), not what "Mark all read" acts on — gate on the unread count instead. An unknown count
  // (query failed) must not read as "confirmed zero", so it doesn't disable the button on its own.
  const { count: unreadCount, error: unreadCountError } = useUnreadNotificationCount()

  const { items, count, isLoading, isFetching, error, refetch } = useNotificationsPage(
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
    resetToFirstPage()
  }

  return (
    <SideDrawer open={open} onClose={onClose} title="Notifications" widthClassName="max-w-lg">
      <div className="flex flex-col h-full -mx-5 -my-4">
        <div className="flex items-center justify-between gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--qms-border)' }}>
          <SegRow>
            <SegButton active={filter === 'all'} onClick={() => changeFilter('all')}>
              All
            </SegButton>
            <SegButton active={filter === 'unread'} onClick={() => changeFilter('unread')}>
              Unread
            </SegButton>
          </SegRow>
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
          <QueryStateBlock
            isLoading={isLoading}
            error={error}
            loadingLabel="Loading notifications…"
            errorLabel="Failed to load notifications."
            onRetry={refetch}
          >
            {items.length === 0 ? (
              <div className="text-[13px] py-12 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
              </div>
            ) : (
              <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                {items.map((item) => (
                  <NotificationCard key={item.id} notification={item} onNavigate={onClose} variant="full" />
                ))}
              </div>
            )}
          </QueryStateBlock>
        </div>

        <div className="px-5 py-3 shrink-0" style={{ borderTop: '1px solid var(--qms-border)' }}>
          <PaginationControls page={page} totalPages={totalPages(count)} onPageChange={setPage} disabled={isFetching} />
        </div>
      </div>
    </SideDrawer>
  )
}

export default NotificationsDrawer
