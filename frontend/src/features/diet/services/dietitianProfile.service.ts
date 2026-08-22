// Dietitian profile bundle — the composition root for the Dietitian Profiles
// screen. Assembles one denormalised payload from every dietitian domain.
//
// Owns no store. This is deliberately shaped like a single API response:
// when the backend lands, `GET /dietitians/:id/profile` replaces the body
// and the screen's components need no change.

import type { Camp } from '@/features/camps/camp.types'
import { PROJECTS } from '@/types/client.types'
import type { DietitianProfileBundle, DietitianProjectBreakdown } from '@/features/diet/dietitians.types'
import { dietitianById, dietitianDetails } from './dietitianRoster.service'
import { getDietitianEquipment } from './dietitianEquipment.service'
import { getDietitianRateHistory, dietitianExpenseFrom } from './dietitianRates.service'
import {
  loadRollupIndex, campPaymentStatusFrom, paymentsByDietitianFrom, dietitianPaymentRollupFrom,
} from './dietitianPayment.service'
import { dietitianFeedbacks, dietitianAverageRating } from './dietitianFeedback.service'

export function dietitianProfileBundle(dietitianId: string, camps: Camp[]): DietitianProfileBundle | null {
  const d = dietitianById(dietitianId)
  if (!d) return null

  // One index for the whole bundle — the rollup, per-camp status and expense
  // all read from it instead of re-parsing their stores per camp.
  const ix = loadRollupIndex()

  const myCamps = camps.filter((c) => c.type === 'Diet' && c.dietitianId === dietitianId)
  const closed = myCamps.filter((c) => c.status === 'CLOSED')
  // "Upcoming" here means "not closed and not cancelled" — no date comparison
  // at all, matching om-data.js:1349 exactly (a past-dated-but-still-open camp
  // still counts as upcoming; a future-dated CLOSED camp would not).
  const upcoming = myCamps.filter((c) => c.status !== 'CLOSED' && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED')
  const payments = paymentsByDietitianFrom(dietitianId, ix)
  const rollup = dietitianPaymentRollupFrom(dietitianId, camps, ix)

  // byProject — group camps by project; READY camps contribute to pendingAmt;
  // ledger payouts are pro-rated evenly across their campIds' projects.
  const byProjectMap = new Map<string, DietitianProjectBreakdown>()
  const resolveProject = (projectId?: string) => PROJECTS.find((p) => p.id === projectId) ?? { id: projectId || 'UNKNOWN', name: projectId || 'Unknown project' }
  myCamps.forEach((c) => {
    const proj = resolveProject(c.projectId)
    const key = proj.id
    const entry = byProjectMap.get(key) ?? { project: { id: proj.id, name: proj.name }, camps: 0, paidAmt: 0, pendingAmt: 0 }
    entry.camps++
    if (campPaymentStatusFrom(c, ix) === 'READY') entry.pendingAmt += dietitianExpenseFrom(c, ix).total
    byProjectMap.set(key, entry)
  })
  payments.forEach((p) => {
    const perCamp = Math.round(p.amount / Math.max(1, p.campIds.length))
    p.campIds.forEach((campId) => {
      const camp = camps.find((c) => c.id === campId)
      const proj = resolveProject(camp?.projectId)
      const entry = byProjectMap.get(proj.id) ?? { project: { id: proj.id, name: proj.name }, camps: 0, paidAmt: 0, pendingAmt: 0 }
      entry.paidAmt += perCamp
      byProjectMap.set(proj.id, entry)
    })
  })

  return {
    dietitian: d,
    details: dietitianDetails(dietitianId),
    equipment: { bca: getDietitianEquipment(dietitianId) },
    camps: myCamps, closed, upcoming, payments, paymentRollup: rollup,
    rateHistory: getDietitianRateHistory(dietitianId),
    feedbacks: dietitianFeedbacks(dietitianId, camps),
    averageRating: dietitianAverageRating(dietitianId, camps),
    byProject: Array.from(byProjectMap.values()),
  }
}

/** Async read boundary — what a future `GET /dietitians/:id/profile` maps onto. */
export async function fetchDietitianProfile(dietitianId: string, camps: Camp[]): Promise<DietitianProfileBundle | null> {
  return dietitianProfileBundle(dietitianId, camps)
}
