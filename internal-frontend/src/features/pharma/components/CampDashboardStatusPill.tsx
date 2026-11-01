import { CAMP_SCHEDULE_STATUS_COLOR, CAMP_SCHEDULE_STATUS_PILL_LABEL } from '@/features/pharma/campDashboardStatus'
import type { CampStatus } from '@/types/campReal.types'

// Clones the prototype's statusPill() styling exactly — plain text, no dot, 14%-tinted
// background — applied to our real backend CampStatus (no derived/guessed status).
const CampDashboardStatusPill = ({ status }: { status: CampStatus }) => {
  const color = CAMP_SCHEDULE_STATUS_COLOR[status]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      {CAMP_SCHEDULE_STATUS_PILL_LABEL[status]}
    </span>
  )
}

export default CampDashboardStatusPill
