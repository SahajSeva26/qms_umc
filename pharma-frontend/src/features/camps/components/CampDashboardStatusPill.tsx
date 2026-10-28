import { CAMP_SCHEDULE_STATUS_COLOR, CAMP_SCHEDULE_STATUS_PILL_LABEL } from '@/features/camps/campDashboardStatus'
import type { CampStatus } from '@/types/campReal.types'

// Plain text, no dot, 14%-tinted background. Mirrors internal-frontend's
// CampDashboardStatusPill.tsx.
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
