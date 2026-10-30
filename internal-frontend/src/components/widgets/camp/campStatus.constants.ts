import type { CampStatus } from '@/types/campReal.types'

// Raw hex + alpha-blend (via ColorPill) since Camp has 6 statuses but only 3 semantic soft-color pairs exist in the design system.
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
