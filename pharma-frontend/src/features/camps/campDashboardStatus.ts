import type { CampStatus } from '@/types/campReal.types'

// Prototype-matching label/color layer over the real backend CampStatus (e.g. live→"Ongoing").
// Mirrors internal-frontend's campDashboardStatus.ts.

// Filter-chip labels, in the prototype's exact DOM order.
export const CAMP_SCHEDULE_STATUS_TABS: { value: CampStatus; label: string }[] = [
  { value: 'requested', label: 'Requested' },
  { value: 'live', label: 'Ongoing' },
  { value: 'confirmed', label: 'Upcoming' },
  { value: 'closed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'cancelled_charged', label: 'Cancelled but charged' },
]

// Status-PILL label set — different text for cancelled_charged vs. its filter chip.
export const CAMP_SCHEDULE_STATUS_PILL_LABEL: Record<CampStatus, string> = {
  requested: 'Requested',
  live: 'Ongoing',
  confirmed: 'Upcoming',
  closed: 'Completed',
  cancelled: 'Cancelled',
  cancelled_charged: 'Cancelled (charged)',
}

export const CAMP_SCHEDULE_STATUS_COLOR: Record<CampStatus, string> = {
  requested: '#94a3b8',
  confirmed: '#3b6dff',
  live: '#10b981',
  closed: '#14b8a6',
  cancelled: '#f59e0b',
  cancelled_charged: '#f43f5e',
}
