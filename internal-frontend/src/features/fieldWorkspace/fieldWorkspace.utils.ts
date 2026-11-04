import type { CampStatus } from '@/types/campReal.types'
import type { FopPillTone } from '@/features/fieldWorkspace/components/fieldWorkspace.primitives'

// Real CampStatus → .fop-camp-row pill tone. The prototype's toneMap also covers invented
// statuses (COMPLETE_WITHOUT_REPORT/INCOMPLETE) that don't exist on the real model — dropped.
export const CAMP_STATUS_TONE: Record<CampStatus, FopPillTone> = {
  requested: 'blue',
  confirmed: 'green',
  live: 'red',
  closed: 'grey',
  cancelled: 'amber',
  cancelled_charged: 'amber',
}

export const CAMP_STATUS_LABEL: Record<CampStatus, string> = {
  requested: 'REQUESTED',
  confirmed: 'SCHEDULED',
  live: 'LIVE',
  closed: 'CLOSED',
  cancelled: 'CANCELLED',
  cancelled_charged: 'CANCELLED',
}

export function fmtShortDate(iso: string): { day: string; month: string } {
  const d = new Date(iso)
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
  }
}

export function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const NOT_PENDING_CLOSURE = new Set<CampStatus>(['closed', 'cancelled', 'cancelled_charged'])

// "Pending closure" is a client-derived category, not a real backend status — a camp whose
// scheduled date has passed but which was never moved to closed/cancelled.
export function isPendingClosure(date: string, status: CampStatus): boolean {
  return new Date(date) < startOfToday() && !NOT_PENDING_CLOSURE.has(status)
}
