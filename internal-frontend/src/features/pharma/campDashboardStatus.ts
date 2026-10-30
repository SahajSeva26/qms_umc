import type { CampStatus } from '@/types/campReal.types'

// Prototype-matching label/color layer over our REAL backend CampStatus — no derived/guessed
// status, just the prototype's exact naming + color scheme applied to the actual status we
// already have (live→"Ongoing", closed→"Completed", cancelled_charged→"Cancelled but charged").

// Filter-chip labels — exact casing from the prototype's statusTabs array, in its exact DOM order.
export const CAMP_SCHEDULE_STATUS_TABS: { value: CampStatus; label: string }[] = [
  { value: 'requested', label: 'Requested' },
  { value: 'live', label: 'Ongoing' },
  { value: 'confirmed', label: 'Upcoming' },
  { value: 'closed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'cancelled_charged', label: 'Cancelled but charged' },
]

// Status-PILL label set — the prototype uses different text for cancelled_charged in its pill
// ("Cancelled (charged)", lowercase, parenthetical) vs. its filter chip ("Cancelled but charged").
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
