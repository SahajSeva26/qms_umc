import type { Camp } from '@/features/camps/camp.types'

// Shared camp-eligibility helpers used by both DashboardModule.tsx and
// ScheduleModule.tsx (Run/Finish button gating).
export const NOT_CANCELLED: Camp['status'][] = ['CANCELLED', 'CANCELLED_CHARGED']
// Excludes COMPLETE_WITHOUT_REPORT on purpose — that status still needs FO closure paperwork.
export const FINISHED_STATUSES: Camp['status'][] = ['CLOSED', 'COMPLETE', 'INCOMPLETE']

export function isCampRunnable(c: Camp, today: string): boolean {
  if (FINISHED_STATUSES.includes(c.status) || NOT_CANCELLED.includes(c.status)) return false
  return (c.date?.slice(0, 10) ?? '') <= today || c.status === 'LIVE' || c.status === 'COMPLETE_WITHOUT_REPORT'
}
