import type { Camp } from '@/types/camp.types'
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
