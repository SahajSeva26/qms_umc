import type { CampStatus } from '@/types/campReal.types'

// Mirrors ProjectStatusPill.tsx's approach (raw hex + alpha-blend background)
// rather than the fixed success/warning/danger utility-class set, since Camp
// has 6 real statuses and only 3 semantic soft-color pairs exist in the
// design system — reusing "danger" for both cancelled variants would make
// them visually indistinguishable.
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

const CampStatusPillReal = ({ status, onClick }: CampStatusPillRealProps) => {
  const color = CAMP_STATUS_COLOR[status] ?? '#94a3b8'

  return (
    <span
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: `${color}22`, color, cursor: onClick ? 'pointer' : undefined }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {CAMP_STATUS_LABEL[status] ?? status}
    </span>
  )
}

export default CampStatusPillReal
