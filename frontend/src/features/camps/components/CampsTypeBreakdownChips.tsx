import { FiActivity, FiHeart, FiDroplet } from 'react-icons/fi'
import type { CampEntity, CampType } from '@/types/campReal.types'
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
  camps: CampEntity[]
  totalCount: number
}

// Prototype's chip row (camps.js:481-490). Computed from the current page only (our list is
// server-paginated) — undercounts past one page; see md-files/ui-revisions.md.
const CampsTypeBreakdownChips = ({ camps, totalCount }: CampsTypeBreakdownChipsProps) => {
  const counts: Record<CampType, number> = { screening: 0, diet: 0, lab: 0 }
  for (const camp of camps) counts[camp.type] += 1

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
