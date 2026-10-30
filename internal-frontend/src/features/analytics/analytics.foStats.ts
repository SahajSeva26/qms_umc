import type { CampEntity } from '@/types/campReal.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'
import type { InventoryAssignmentReportFieldOfficer } from '@/types/inventoryAssignment.types'
import { regionForState } from '@/features/analytics/analytics.foRegion'

export interface FoLeaderboardRow {
  roleId: string
  name: string
  code: string
  camps: number
  closed: number
  patients: number
  patientsCompleted: number
}

export interface FoRegionRow {
  region: string
  fos: number
  camps: number
}

function foRoleIdOf(camp: CampEntity): string | null {
  if (!camp.fo) return null
  return typeof camp.fo === 'string' ? camp.fo : (camp.fo._id ?? null)
}

const CLOSED_STATUSES = new Set(['closed', 'cancelled_charged'])

// Every roster FO appears even with zero camps — joined onto the roster by role id, not the
// other way round, so a camps-only sweep can't silently drop an unassigned FO.
export function buildFoLeaderboard(roster: InventoryAssignmentReportFieldOfficer[], camps: CampEntity[]): FoLeaderboardRow[] {
  const byRole = new Map<string, { camps: number; closed: number; patients: number; patientsCompleted: number }>()

  for (const camp of camps) {
    const roleId = foRoleIdOf(camp)
    if (!roleId) continue
    const entry = byRole.get(roleId) ?? { camps: 0, closed: 0, patients: 0, patientsCompleted: 0 }
    entry.camps++
    if (CLOSED_STATUSES.has(camp.status)) entry.closed++
    entry.patients += camp.stats?.patients ?? 0
    entry.patientsCompleted += camp.stats?.patientsCompleted ?? 0
    byRole.set(roleId, entry)
  }

  return roster
    .map((fo) => {
      const stats = byRole.get(fo.role) ?? { camps: 0, closed: 0, patients: 0, patientsCompleted: 0 }
      return { roleId: fo.role, name: fo.name, code: fo.code, ...stats }
    })
    .sort((a, b) => b.camps - a.camps)
}

// Grouped by the FO's geoProfile state, mapped to a zone. An FO with no geoProfile is excluded,
// not bucketed as a fake "Other".
export function buildFoRegionSpread(geoProfiles: GeoProfileEntity[], camps: CampEntity[]): FoRegionRow[] {
  const regionByRole = new Map<string, string>()
  for (const profile of geoProfiles) {
    if (!profile.state) continue
    regionByRole.set(profile.role, regionForState(profile.state))
  }

  const byRegion = new Map<string, { fos: Set<string>; camps: number }>()
  for (const [roleId, region] of regionByRole) {
    const entry = byRegion.get(region) ?? { fos: new Set<string>(), camps: 0 }
    entry.fos.add(roleId)
    byRegion.set(region, entry)
  }

  for (const camp of camps) {
    const roleId = foRoleIdOf(camp)
    if (!roleId) continue
    const region = regionByRole.get(roleId)
    if (!region) continue
    const entry = byRegion.get(region)
    if (entry) entry.camps++
  }

  return Array.from(byRegion.entries())
    .map(([region, entry]) => ({ region, fos: entry.fos.size, camps: entry.camps }))
    .sort((a, b) => b.camps - a.camps)
}
