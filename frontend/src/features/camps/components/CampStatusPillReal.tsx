import type { CampStatus } from '@/features/camps/campReal.types'
import ColorPill from '@/components/ui/ColorPill'

// Uses ColorPill's raw hex + alpha-blend background since Camp has 6 statuses
// but only 3 semantic soft-color pairs exist in the design system.
export const CAMP_STATUS_COLOR: Record<CampStatus, string> = {
  requested: '#f59e0b',
  confirmed: '#3b6dff',
  live: '#10b981',
  closed: '#64748b',
  cancelled: '#ef4444',
  cancelled_charged: '#b91c1c',
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
