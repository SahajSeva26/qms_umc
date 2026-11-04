import { FiBell, FiBellOff, FiCheck } from 'react-icons/fi'
import { useNotificationsPage, useMarkAllNotificationsRead } from '@qms/core'
import api from '@/lib/api/api'
import { FopPageHeading, FopCard, FopCardHeader, FopEmpty, FopCta, FopPill } from '@/features/fieldWorkspace/components/fieldWorkspace.primitives'
import QueryStateBlock from '@/components/ui/QueryStateBlock'

// Mirrors the prototype's Notifications tab. Known gap: the real Notification model has no
// `priority` field — the prototype's priority pill is replaced with a real read/unread one.
const NotificationsTab = () => {
  const { items, isLoading, error, refetch } = useNotificationsPage(api, { limit: '50' })
  const markAllRead = useMarkAllNotificationsRead(api)

  return (
    <div>
      <FopPageHeading title="Notifications" subtitle="All system alerts · ordered by recency" />

      <FopCard>
        <FopCardHeader right={
          <FopCta tone="ghost" sm onClick={() => markAllRead.mutate()}>
            <FiCheck size={13} /> Mark all read
          </FopCta>
        }>
          All notifications
        </FopCardHeader>

        <QueryStateBlock
          isLoading={isLoading}
          error={error}
          loadingLabel="Loading notifications…"
          errorLabel="Couldn't load your notifications."
          onRetry={() => void refetch()}
        >
          {items.length === 0 ? (
            <FopEmpty icon={FiBellOff} label="No notifications" />
          ) : (
            items.map((n) => (
              <div key={n.id} className="flex gap-2.5 py-2 border-b border-dashed last:border-b-0 items-start" style={{ borderColor: 'var(--qms-border)' }}>
                <div className="w-[30px] h-[30px] rounded-lg shrink-0 flex items-center justify-center" style={{ background: 'rgba(20,184,166,.1)', color: '#0d9488' }}>
                  <FiBell size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[12.5px]">{n.subject ?? n.event}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{n.body}</div>
                </div>
                <FopPill tone={n.read ? 'grey' : 'blue'}>{n.read ? 'READ' : 'NEW'}</FopPill>
              </div>
            ))
          )}
        </QueryStateBlock>
      </FopCard>
    </div>
  )
}

export default NotificationsTab
