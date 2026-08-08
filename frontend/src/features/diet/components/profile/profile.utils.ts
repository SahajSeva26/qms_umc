// Shared tiny helpers for the Dietitian Profiles screen's sub-components.

// Moved to utils/personDisplay.ts (was duplicated four times across Diet).
export { initials } from '@/features/diet/utils/personDisplay'

export function fmtDate(d?: string | null): string {
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
  } catch {
    return d
  }
}
