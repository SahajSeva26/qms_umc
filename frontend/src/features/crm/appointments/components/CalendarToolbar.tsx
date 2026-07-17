import { FiChevronLeft, FiChevronRight, FiPlus } from 'react-icons/fi'
import type { MeetingOwner } from '@/types/meeting.types'
import { formatWeekRange, TONE_COLORS } from '@/features/crm/appointments/appointments.utils'

export type CalendarViewMode = 'week' | 'month' | 'list'

const VIEWS: { id: CalendarViewMode; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'list', label: 'List' },
]

interface CalendarToolbarProps {
  weekStart: Date
  view: CalendarViewMode
  onViewChange: (view: CalendarViewMode) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  peerOwners: MeetingOwner[]
  activePeers: Set<string>
  onTogglePeer: (id: string) => void
  onNewMeeting: () => void
}

const navBtnClasses = 'h-8 flex items-center justify-center rounded-lg border transition-colors hover:bg-(--qms-surface-hover)'
const navBtnStyle = { borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }

const CalendarToolbar = ({
  weekStart,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  peerOwners,
  activePeers,
  onTogglePeer,
  onNewMeeting,
}: CalendarToolbarProps) => (
  <div
    className="flex flex-wrap items-center gap-2 p-2.5 mb-3 rounded-xl border"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    <div className="flex items-center gap-1">
      <button onClick={onPrev} aria-label="Previous week" className={`${navBtnClasses} w-8`} style={navBtnStyle}>
        <FiChevronLeft size={15} />
      </button>
      <button onClick={onToday} className={`${navBtnClasses} px-3 text-[12px] font-semibold`} style={navBtnStyle}>
        Today
      </button>
      <button onClick={onNext} aria-label="Next week" className={`${navBtnClasses} w-8`} style={navBtnStyle}>
        <FiChevronRight size={15} />
      </button>
    </div>

    <div className="text-[13px] font-bold px-1" style={{ color: 'var(--qms-text)' }}>
      {formatWeekRange(weekStart)}
    </div>

    <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--qms-surface-strong)' }}>
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => onViewChange(v.id)}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={view === v.id ? { background: 'var(--qms-surface-card)', color: 'var(--qms-text)' } : { color: 'var(--qms-text-muted)' }}
        >
          {v.label}
        </button>
      ))}
    </div>

    <div className="flex items-center gap-1.5 flex-wrap">
      {peerOwners.map((o) => {
        const active = activePeers.has(o.id)
        return (
          <button
            key={o.id}
            onClick={() => onTogglePeer(o.id)}
            title={active ? `Hide ${o.name}'s meetings` : `Overlay ${o.name}'s meetings`}
            className="flex items-center gap-1.5 h-7 pl-1.5 pr-2.5 rounded-full border text-[11px] font-semibold transition-colors"
            style={
              active
                ? { borderColor: 'var(--qms-brand)', background: 'rgba(59,109,255,.08)', color: 'var(--qms-text)' }
                : { borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }
            }
          >
            <span className="w-4 h-4 rounded-full shrink-0" style={{ background: TONE_COLORS[o.tone] ?? 'var(--qms-brand)' }} />
            {o.name.split(' ')[0]}
          </button>
        )
      })}
    </div>

    <div className="flex-1" />

    <button
      onClick={onNewMeeting}
      className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
      style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
    >
      <FiPlus size={14} /> New meeting
    </button>
  </div>
)

export default CalendarToolbar
