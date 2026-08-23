import type { Camp } from '@/features/camps/camp.types'
import type { DietStage } from '@/features/diet/diet.types'

// Mirrors dietStage() exactly (diet-camps.js:423-436) — the derived UI-facing
// pipeline, computed live, never stored. Distinct from Camp Management's
// campStage() (camps.utils.ts), which uses a different bucket set.
export function dietStage(c: Camp): DietStage {
  if (c.status === 'CLOSED') return 'COMPLETED'
  if (c.status === 'CANCELLED_CHARGED') return 'CHARGED'
  if (c.status === 'CANCELLED') return 'CANCELLED'
  if (c.status === 'LIVE') return 'LIVE'

  const hasTeam = !!(c.foId || c.resources?.FO) && !!c.dietitianId
  const confirmed = Object.values(c.confirmations ?? {}).some((conf) => conf.status === 'CONFIRMED')
  if (hasTeam && confirmed) return 'UPCOMING'
  if (c.dietitianId || c.foId || c.resources?.FO) return 'ASSIGNED'
  return 'REQUESTED'
}

// ── Currency display ─────────────────────────────────────────────────────
// Deliberately NOT the shared formatINR() from @/utils/formatters — that one
// uses 2 decimals for Lakhs and has a Thousands tier; these match the Diet
// prototype's own om-data.js tiers exactly. Merging them would change every
// figure on the Diet screens.

export function fmtInr(n: number): string {
  n = Number(n) || 0
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr'
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + ' L'
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

// Same tier list as fmtInr but with a Thousands step, used by
// diet-approvals.js's dashboard KPIs (fmtInrLocal).
export function fmtInrCompact(n: number): string {
  n = Number(n) || 0
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr'
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + ' L'
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K'
  return '₹' + Math.round(n).toLocaleString('en-IN')
}
