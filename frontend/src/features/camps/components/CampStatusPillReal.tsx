import type { CampStatus } from '@/types/campReal.types'
import ColorPill from '@/components/ui/ColorPill'

// Uses ColorPill's raw hex + alpha-blend background since Camp has 6 statuses
// but only 3 semantic soft-color pairs exist in the design system.
//
// Matches the prototype's CAMP_STATUSES colors exactly (camps-data.js:11-19); no SCHEDULED
// equivalent exists in our 6-status enum.
export const CAMP_STATUS_COLOR: Record<CampStatus, string> = {
  requested: '#94a3b8',
  confirmed: '#3b6dff',
  live: '#10b981',
  closed: '#14b8a6',
  cancelled: '#f59e0b',
  cancelled_charged: '#f43f5e',
}

export const CAMP_STATUS_LABEL: Record<CampStatus, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  live: 'Live',
  closed: 'Closed',
  cancelled: 'Cancelled',
  cancelled_charged: 'Cancelled (Charged)',
}

interface CampStatusPillRealProps {
  status: CampStatus
  onClick?: () => void
}

const CampStatusPillReal = ({ status, onClick }: CampStatusPillRealProps) => (
  <ColorPill status={status} colorMap={CAMP_STATUS_COLOR} labelMap={CAMP_STATUS_LABEL} onClick={onClick} />
)

export default CampStatusPillReal
