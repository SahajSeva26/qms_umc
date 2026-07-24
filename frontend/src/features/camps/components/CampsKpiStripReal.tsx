import type { CampStatus } from '@/types/campReal.types'
import { CAMP_STATUS_COLOR, CAMP_STATUS_LABEL } from '@/features/camps/components/CampStatusPillReal'

const TILE_STATUSES: CampStatus[] = ['requested', 'confirmed', 'live', 'closed', 'cancelled', 'cancelled_charged']

interface CampsKpiStripRealProps {
  counts: Record<CampStatus, number>
  total: number
  activeStatus: CampStatus | 'ALL'
  onSelectStatus: (status: CampStatus | 'ALL') => void
}

// One tile per real status (not a fabricated "stage" bucket like the old
// mock's campStage() derivation) — doubles as a status-filter shortcut,
// same interaction pattern as the old CampsKpiStrip.
const CampsKpiStripReal = ({ counts, total, activeStatus, onSelectStatus }: CampsKpiStripRealProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-4">
      <button
        onClick={() => onSelectStatus('ALL')}
        className="rounded-xl border p-3 text-left transition-colors hover:bg-(--qms-surface-hover)"
        style={{
          borderColor: activeStatus === 'ALL' ? 'var(--qms-brand)' : 'var(--qms-border)',
          background: 'var(--qms-surface-card)',
        }}
      >
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>All</div>
        <div className="text-xl font-extrabold mt-0.5" style={{ color: 'var(--qms-text)' }}>{total}</div>
      </button>

      {TILE_STATUSES.map((status) => {
        const color = CAMP_STATUS_COLOR[status]
        const active = activeStatus === status
        return (
          <button
            key={status}
            onClick={() => onSelectStatus(status)}
            className="rounded-xl border p-3 text-left transition-colors hover:bg-(--qms-surface-hover)"
            style={{
              borderColor: active ? color : 'var(--qms-border)',
              background: 'var(--qms-surface-card)',
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wide truncate" style={{ color: 'var(--qms-text-muted)' }}>
              {CAMP_STATUS_LABEL[status]}
            </div>
            <div className="text-xl font-extrabold mt-0.5" style={{ color }}>{counts[status] ?? 0}</div>
          </button>
        )
      })}
    </div>
  )
}

export default CampsKpiStripReal
