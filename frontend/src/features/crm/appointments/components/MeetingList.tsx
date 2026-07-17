import type { Meeting } from '@/types/meeting.types'
import { MEETING_STATUS_META, MEETING_TYPE_META } from '@/types/meeting.types'
import { formatDate } from '@/utils/formatters'
import { formatTimeRange, isMomOverdue } from '@/features/crm/appointments/appointments.utils'

interface MeetingListProps {
  meetings: Meeting[]
  meId: string
  onOpen: (id: string) => void
}

const PEER_GRAY = '#94a3b8'

const MeetingList = ({ meetings, meId, onOpen }: MeetingListProps) => {
  if (meetings.length === 0) {
    return (
      <div
        className="rounded-2xl border p-8 text-center text-[13px]"
        style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
      >
        No meetings this week
      </div>
    )
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}>
      {meetings.map((m, i) => {
        const isPeer = m.ownerId !== meId
        const status = MEETING_STATUS_META[m.status]
        const overdue = !isPeer && isMomOverdue(m)
        return (
          <div
            key={m.id}
            onClick={isPeer ? undefined : () => onOpen(m.id)}
            className={`flex items-center gap-3 px-3 py-2.5 ${isPeer ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:bg-(--qms-surface-hover)'}`}
            style={i > 0 ? { borderTop: '1px solid var(--qms-border)' } : undefined}
          >
            <span
              className="w-1 self-stretch rounded-full shrink-0"
              style={{ background: isPeer ? PEER_GRAY : MEETING_TYPE_META[m.type].color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                {isPeer ? `BUSY · ${m.ownerName}` : `${m.pharmaName} · ${m.contactName}`}
              </div>
              <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                {isPeer
                  ? `${formatDate(m.startAt)} · ${formatTimeRange(m.startAt, m.endAt)}`
                  : [MEETING_TYPE_META[m.type].name, formatDate(m.startAt), formatTimeRange(m.startAt, m.endAt), m.city]
                      .filter(Boolean)
                      .join(' · ')}
                {overdue && <span className="font-semibold text-danger"> · ⚠ MOM overdue</span>}
              </div>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
              style={{ background: `${status.color}22`, color: status.color }}
            >
              {status.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default MeetingList
