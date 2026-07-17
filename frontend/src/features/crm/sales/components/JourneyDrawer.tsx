import SideDrawer from '@/components/ui/SideDrawer'
import KeyValueGrid from '@/components/ui/KeyValueGrid'
import UserAvatar from '@/components/ui/UserAvatar'
import { formatDate } from '@/utils/formatters'
import type { Journey } from '@/types/salesdash.types'
import {
  CADENCE_COLORS,
  MEETING_STATUS_COLORS,
  MEETING_TYPE_COLORS,
  daysBetween,
  splitName,
  tintStyle,
} from '@/features/crm/sales/sales.utils'

interface JourneyDrawerProps {
  journey: Journey | null
  onClose: () => void
}

const healthPill = (journey: Journey) => {
  if (journey.won) return { label: 'Won · PO', color: '#10b981' }
  if (journey.stuck) return { label: `Stuck ${journey.daysSinceLast}d`, color: '#f43f5e' }
  if (journey.followupCount > 0) return { label: 'Active', color: '#3b6dff' }
  return { label: 'New', color: '#94a3b8' }
}

const formatDateTime = (iso: string) =>
  `${formatDate(iso)} · ${new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`

// Read-only view of one account journey — booking/MOM edits live in Appointments.
const JourneyDrawer = ({ journey, onClose }: JourneyDrawerProps) => {
  if (!journey) return <SideDrawer open={false} title="" onClose={onClose}><div /></SideDrawer>

  const health = healthPill(journey)
  const owner = splitName(journey.ownerName || '—')

  return (
    <SideDrawer open title="Meeting → PO journey" onClose={onClose}>
      <div className="mb-4">
        <div className="text-[15px] font-bold" style={{ color: 'var(--qms-text)' }}>{journey.account}</div>
        <div className="text-[12px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>{journey.contact}</div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={tintStyle(health.color)}>{health.label}</span>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}
          >
            <UserAvatar firstName={owner.firstName} lastName={owner.lastName} tone={journey.ownerTone} size="sm" />
            {owner.firstName || '—'}
          </span>
        </div>
      </div>

      <div
        className="rounded-xl border p-3.5 mb-4"
        style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
      >
        <KeyValueGrid
          items={[
            { label: 'Meetings', value: journey.totalTouchpoints },
            { label: 'Cadence', value: journey.cadenceBand === 'NONE' ? 'Single touch' : `${journey.cadenceBand} · avg ${journey.avgGapDays}d` },
            { label: 'Last touch', value: `${formatDate(journey.lastTouch)} · ${journey.daysSinceLast}d ago` },
            { label: 'Days to PO', value: journey.won ? `${daysBetween(journey.anchorDate, journey.lastTouch)}d` : '—' },
          ]}
        />
      </div>

      <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Touchpoint timeline
      </div>
      <div className="relative pl-4" style={{ borderLeft: '2px solid var(--qms-border)' }}>
        {journey.meetings.map((meeting, i) => {
          const typeColor = MEETING_TYPE_COLORS[meeting.type] ?? '#3b6dff'
          const statusColor = MEETING_STATUS_COLORS[meeting.status] ?? '#94a3b8'
          const gap = i > 0 ? daysBetween(journey.meetings[i - 1].startAt, meeting.startAt) : 0
          return (
            <div key={meeting.id ?? `${meeting.startAt}-${i}`} className="relative pb-4">
              <span
                className="absolute -left-5.75 top-1 w-3 h-3 rounded-full"
                style={{ background: 'var(--qms-surface-card)', border: `3px solid ${typeColor}` }}
              />
              {i > 0 && (
                <div className="text-[10px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>+{gap}d after previous</div>
              )}
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={tintStyle(typeColor)}>{meeting.type}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={tintStyle(statusColor)}>{meeting.status}</span>
              </div>
              <div className="text-[11px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>
                {formatDateTime(meeting.startAt)}{meeting.city ? ` · ${meeting.city}` : ''}
              </div>
              {meeting.agendaPublic && (
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--qms-text-soft)' }}>{meeting.agendaPublic}</p>
              )}
              {meeting.momText && (
                <div
                  className="rounded-lg p-2.5 mt-1.5"
                  style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)' }}
                >
                  <div className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                    Minutes of meeting
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--qms-text-soft)' }}>{meeting.momText}</p>
                </div>
              )}
              {meeting.nextSteps && (
                <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-soft)' }}>
                  <span className="font-bold" style={{ color: 'var(--qms-text)' }}>Next steps:</span> {meeting.nextSteps}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div
        className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-lg"
        style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: CADENCE_COLORS[journey.cadenceBand] }} />
        Cadence: {journey.cadenceBand} · read-only — manage meetings from Appointments
      </div>
    </SideDrawer>
  )
}

export default JourneyDrawer
