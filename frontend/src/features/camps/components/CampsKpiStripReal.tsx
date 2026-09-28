import type { IconType } from 'react-icons'
import { FiInbox, FiCalendar, FiPlayCircle, FiCheckCircle, FiXCircle, FiAlertTriangle, FiExternalLink } from 'react-icons/fi'
import type { CampStatus } from '@/types/campReal.types'
import { CAMP_STATUS_COLOR, CAMP_STATUS_LABEL } from '@/features/camps/components/CampStatusPillReal'

const TILE_STATUSES: CampStatus[] = ['requested', 'confirmed', 'live', 'closed', 'cancelled', 'cancelled_charged']

// KPI-strip-only display names — the underlying CampStatus values/transitions
// are unchanged; CAMP_STATUS_LABEL elsewhere (e.g. status pills) still says
// "Confirmed"/"Closed".
const TILE_LABEL_OVERRIDE: Partial<Record<CampStatus, string>> = {
  confirmed: 'Upcoming',
  closed: 'Completed',
}

// Matches the prototype's per-tile icons (camps.js:239-247); its extra "Completed·Pending"
// tile has no equivalent in our 6-status enum (see md-files/ui-revisions.md).
const TILE_ICON: Record<CampStatus, IconType> = {
  requested: FiInbox,
  confirmed: FiCalendar,
  live: FiPlayCircle,
  closed: FiCheckCircle,
  cancelled: FiXCircle,
  cancelled_charged: FiAlertTriangle,
}

interface CampsKpiStripRealProps {
  counts: Record<CampStatus, number>
  total: number
  activeStatus: CampStatus | 'ALL'
  onSelectStatus: (status: CampStatus | 'ALL') => void
}

// One tile per real status (not a fabricated "stage" bucket like the old
// mock's campStage() derivation) — doubles as a status-filter shortcut,
// same interaction pattern as the old CampsKpiStrip.
//
// Prototype's KPI tile (camps.js:212-260) — left-border color coding (not a full-border
// highlight), an icon, and a trailing external-link glyph signaling "click to drill in."
const CampsKpiStripReal = ({ counts, total, activeStatus, onSelectStatus }: CampsKpiStripRealProps) => {
  return (
    <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
      <button
        onClick={() => onSelectStatus('ALL')}
        className="rounded-xl border p-3 text-left transition-colors hover:bg-(--qms-surface-hover)"
        style={{
          borderColor: 'var(--qms-border)',
          borderLeft: `3px solid ${activeStatus === 'ALL' ? 'var(--qms-brand)' : 'var(--qms-border)'}`,
          background: 'var(--qms-surface-card)',
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>All</span>
          <FiExternalLink size={11} style={{ color: 'var(--qms-text-muted)' }} />
        </div>
        <div className="text-xl font-extrabold mt-0.5" style={{ color: 'var(--qms-text)' }}>{total}</div>
      </button>

      {TILE_STATUSES.map((status) => {
        const color = CAMP_STATUS_COLOR[status]
        const active = activeStatus === status
        const Icon = TILE_ICON[status]
        return (
          <button
            key={status}
            onClick={() => onSelectStatus(status)}
            className="rounded-xl border p-3 text-left transition-colors hover:bg-(--qms-surface-hover)"
            style={{
              // Left-border tone is now permanent per-tile (was previously active-only); the
              // full border still switches to brand color as the separate "selected" signal.
              borderColor: active ? 'var(--qms-brand)' : 'var(--qms-border)',
              borderLeft: `3px solid ${color}`,
              background: 'var(--qms-surface-card)',
            }}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide truncate" style={{ color: 'var(--qms-text-muted)' }}>
                <Icon size={11} />
                {TILE_LABEL_OVERRIDE[status] ?? CAMP_STATUS_LABEL[status]}
              </span>
              <FiExternalLink size={11} className="shrink-0" style={{ color: 'var(--qms-text-muted)' }} />
            </div>
            <div className="text-xl font-extrabold mt-0.5" style={{ color }}>{counts[status] ?? 0}</div>
          </button>
        )
      })}
    </div>
  )
}

export default CampsKpiStripReal
