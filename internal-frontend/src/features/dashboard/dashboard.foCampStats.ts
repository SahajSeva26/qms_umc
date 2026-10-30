import type { CampEntity } from '@/types/campReal.types'
import { CAMP_TIME_SLOT_LABEL, CAMP_TIME_SLOT_VALUES, type CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import { regionForState } from '@/features/dashboard/dashboard.foRegion'

export interface FoRegionRow {
  region: string
  fos: number
  camps: number
  share: number
}

export interface FoTimeSlotRow {
  slot: string
  count: number
  share: number
}

function foIdOf(camp: CampEntity): string | null {
  if (!camp.fo) return null
  return typeof camp.fo === 'string' ? camp.fo : (camp.fo._id ?? camp.fo.code)
}

// Groups conducted camps by camp.location.state, mapped to a zone via regionForState(). Camps
// with no location are excluded rather than bucketed as a fake region.
export function buildFoRegionalSpread(camps: CampEntity[]): FoRegionRow[] {
  const byRegion = new Map<string, { camps: number; foIds: Set<string> }>()

  for (const camp of camps) {
    if (!camp.location?.state) continue
    const region = regionForState(camp.location.state)
    const entry = byRegion.get(region) ?? { camps: 0, foIds: new Set<string>() }
    entry.camps++
    const foId = foIdOf(camp)
    if (foId) entry.foIds.add(foId)
    byRegion.set(region, entry)
  }

  const totalCamps = camps.length || 1
  return Array.from(byRegion.entries())
    .map(([region, entry]) => ({
      region,
      fos: entry.foIds.size,
      camps: entry.camps,
      share: Math.round((entry.camps / totalCamps) * 100),
    }))
    .sort((a, b) => b.camps - a.camps)
}

export function buildFoTimeSlotBifurcation(camps: CampEntity[]): FoTimeSlotRow[] {
  const counts = new Map<CampTimeSlotValue, number>(CAMP_TIME_SLOT_VALUES.map((v) => [v, 0]))
  let totalWithSlot = 0

  for (const camp of camps) {
    if (!camp.timeSlot) continue
    counts.set(camp.timeSlot, (counts.get(camp.timeSlot) ?? 0) + 1)
    totalWithSlot++
  }

  const denom = totalWithSlot || 1
  return CAMP_TIME_SLOT_VALUES.map((slot) => ({
    slot: CAMP_TIME_SLOT_LABEL[slot],
    count: counts.get(slot) ?? 0,
    share: Math.round(((counts.get(slot) ?? 0) / denom) * 100),
  }))
}
