import { FiActivity, FiHeart, FiDroplet } from 'react-icons/fi'
import type { CampType } from '@/types/campReal.types'
import { CAMP_TYPE_LABEL } from '@/types/campReal.types'

const TYPE_COLOR: Record<CampType, string> = {
  screening: '#3b6dff',
  diet: '#10b981',
  lab: '#8b5cf6',
}

const TYPE_ICON: Record<CampType, typeof FiActivity> = {
  screening: FiActivity,
  diet: FiHeart,
  lab: FiDroplet,
}

const ALL_TYPES: CampType[] = ['screening', 'diet', 'lab']

interface CampsTypeBreakdownChipsProps {
  // Server-side per-status-tab breakdown (GET /camps/report?status=<tab>), not just the current page's rows.
  byType: { type: CampType; count: number }[]
  totalCount: number
  isLoading: boolean
  error: unknown
  onRetry: () => void
  // Caller lacks the report endpoint's own gate — never show chips as if they were real zero counts.
  canView: boolean
  // CampReportQuerySchema accepts ONLY `status` — true when any non-status filter is active.
  unavailableWhileFiltered: boolean
}

// Its own loading/error state, distinct from the camp list's QueryStateBlock — a separate request that can fail independently.
const CampsTypeBreakdownChips = ({ byType, totalCount, isLoading, error, onRetry, canView, unavailableWhileFiltered }: CampsTypeBreakdownChipsProps) => {
  if (!canView) {
    return (
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[12px] italic" style={{ color: 'var(--qms-text-muted)' }}>
          You don't have permission to view the type breakdown.
        </span>
      </div>
    )
  }

  if (unavailableWhileFiltered) {
    return (
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[12px] italic" style={{ color: 'var(--qms-text-muted)' }}>
          Type breakdown isn't available while filters are active — it only scopes by status.
        </span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[12px] italic" style={{ color: 'var(--qms-text-muted)' }}>Loading breakdown…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button onClick={onRetry} className="text-[12px] font-semibold underline decoration-dotted text-danger">
          Couldn't load type breakdown — retry
        </button>
      </div>
    )
  }

  const counts: Record<CampType, number> = { screening: 0, diet: 0, lab: 0 }
  for (const entry of byType) counts[entry.type] = entry.count

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {ALL_TYPES.map((type) => {
        const color = TYPE_COLOR[type]
        const Icon = TYPE_ICON[type]
        return (
          <span
            key={type}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full border"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
          >
            <Icon size={12} style={{ color }} />
            {CAMP_TYPE_LABEL[type]}: <b style={{ color: 'var(--qms-text)' }}>{counts[type]}</b>
          </span>
        )
      })}
      <span className="ml-auto text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
        <b style={{ color: 'var(--qms-text)' }}>{totalCount}</b> total
      </span>
    </div>
  )
}

export default CampsTypeBreakdownChips
