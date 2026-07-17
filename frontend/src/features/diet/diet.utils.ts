import type { Camp } from '@/types/camp.types'
import type { DietStage } from '@/features/diet/diet.types'
import type { UserRole } from '@/types/auth.types'

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

// dietViewOnly() — hardcoded single-role check, independent of navConfig's
// rolesAllowed (diet-camps.js:328-330: only camp_coord is page-logic
// view-only; other viewOnly roles per roles.js are shell-level, out of this
// file's scope per the research).
export function dietViewOnly(role?: UserRole): boolean {
  return role === 'camp_coord'
}

// isKam() — Key Account Manager data-scoping check (diet-camps.js:335).
export function isKam(role?: UserRole): boolean {
  return role === 'sales_rep'
}
