// The single joined view of "who is a dietitian" for the Diet screens.
//
// The feature has two stores that both looked like rosters. They are not:
//
//   dietitianRoster.service  → IDENTITY. PEOPLE(role=Dietitian) + locally
//                              enrolled records. This is canonical: it is what
//                              assignment writes into camp.dietitianId, and the
//                              only source that can grow (enrolment).
//   diet.service `qms.diet.dietitians` → OPERATIONAL OVERLAY, keyed by the same
//                              id: commercials (rem/TA/DA/printing), assigned
//                              machines, qualification, internal code, gmap.
//
// Before this join, camp cards resolved camp.dietitianId against the overlay
// only, so a newly enrolled dietitian assigned via the rate sheet rendered with
// no name. That worked solely because the three seeded ids happened to exist in
// both stores.
//
// Every roster member appears here. Overlay-only fields are projected from real
// roster values where an equivalent exists (hq → city, ratePerCamp →
// remuneration) and left at zero/empty where the overlay genuinely has no data
// yet — nothing is invented.

import type { Dietitian } from '@/features/diet/diet.types'
import { dietitianRoster } from './dietitianRoster.service'

/** Projects a canonical roster entry onto the operational display shape. */
function fromRosterEntry(id: string, name: string, hq: string, states: string[], ratePerCamp: number, approved: boolean, joinedOn: string | undefined): Dietitian {
  return {
    id,
    code: '',
    name,
    email: '',
    phone: '',
    qualification: '',
    resumeUrl: '',
    interviewed: approved,
    remuneration: ratePerCamp,
    ta: 0,
    da: 0,
    printing: 0,
    address: '',
    state: states[0] ?? '',
    city: hq,
    machinesAssigned: [],
    status: 'ACTIVE',
    joined: joinedOn ?? '',
  }
}

/**
 * Canonical roster joined with the operational overlay.
 *
 * `profiles` is the overlay list the caller already has from the
 * `['diet-own-data']` query — passed in rather than re-read so this stays a
 * pure join and the caller keeps one cache entry.
 */
export function dietitianDirectory(profiles: Dietitian[]): Dietitian[] {
  const overlayById = new Map(profiles.map((p) => [p.id, p]))
  const seen = new Set<string>()

  const joined = dietitianRoster().map((r) => {
    seen.add(r.id)
    const overlay = overlayById.get(r.id)
    const base = fromRosterEntry(
      r.id, r.name, r.hq, r.states, r.ratePerCamp,
      r.real || r.status === 'APPROVED', r.joinedOn,
    )
    // Overlay wins where it has data — it is the richer, hand-maintained record.
    return overlay ? { ...base, ...overlay } : base
  })

  // Overlay records with no roster entry would otherwise vanish from the UI.
  // There should be none once enrolment always mints identity first, but
  // dropping real seeded data silently would be worse than showing it.
  const orphans = profiles.filter((p) => !seen.has(p.id))
  return [...joined, ...orphans]
}

/** Display name for a camp's assigned dietitian. Resolves against identity. */
export function dietitianDisplayName(dietitianId: string | undefined, directory: Dietitian[]): string | undefined {
  if (!dietitianId) return undefined
  return directory.find((d) => d.id === dietitianId)?.name
}
