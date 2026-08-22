// Diet camp workflow — the 24h submission-token lock, reopen-request inbox,
// and the coordinator assignment/decision Camp patches.
//
// Owns no store: every write here returns a Partial<Camp> patch that the
// caller persists through the shared camps hook (features/camps/ is the sole
// owner of the camp store).

import type { Camp } from '@/features/camps/camp.types'
import type { CampReopenRequest } from '@/features/diet/dietitians.types'
import { arr } from './dietStorage'
import { dietitianApproved, dietitianById, dietitianName } from './dietitianRoster.service'

export const TOKEN_TTL_HOURS = 24

export function isTokenLocked(camp: Camp): boolean {
  if (camp.submissionCompleted) return false
  if (!camp.tokenActivatedAt) return false
  const hrs = (Date.now() - new Date(camp.tokenActivatedAt).getTime()) / 3_600_000
  return hrs >= TOKEN_TTL_HOURS
}

export function tokenHoursLeft(camp: Camp): number | null {
  if (!camp.tokenActivatedAt) return null
  const hrs = TOKEN_TTL_HOURS - (Date.now() - new Date(camp.tokenActivatedAt).getTime()) / 3_600_000
  return hrs
}

export function pendingReopenRequests(camps: Camp[]): { campId: string; city: string; date: string; dietitianName: string; request: CampReopenRequest }[] {
  const out: { campId: string; city: string; date: string; dietitianName: string; request: CampReopenRequest }[] = []
  camps.forEach((c) => {
    const pending = arr(c.reopenRequests).find((r) => r.status === 'PENDING')
    if (pending) out.push({ campId: c.id, city: c.city, date: c.date, dietitianName: c.dietitianId ? dietitianName(c.dietitianId) : '', request: pending })
  })
  return out
}

// assignDietitianByCoord — direct one-click assign; writes camp.dietitianId,
// a dietitianProposal already marked APPROVED (no separate pending stage in
// the live UI), and appends a rate-history entry. Blocked if the dietitian
// hasn't cleared OM·Diet approval. om-data.js:649-658.
export function assignDietitianByCoordPatch(
  camp: Camp, dietitianId: string, by: string,
  rates: { remuneration: number; ta: number; printing: number; targetCost: number; reason: string }
): Partial<Camp> | null {
  if (!dietitianApproved(dietitianId)) return null
  const d = dietitianById(dietitianId)
  return {
    dietitianId,
    dietitianRates: { remuneration: rates.remuneration, ta: rates.ta, printing: rates.printing, targetCost: rates.targetCost },
    dietitianProposal: {
      suggestedDietitianId: dietitianId,
      suggestedDietitianName: d?.name ?? dietitianId,
      suggestedAt: new Date().toISOString(),
      suggestedBy: by,
      reasons: [],
      score: 0,
      status: 'APPROVED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: by,
    },
    status: camp.status === 'REQUESTED' ? 'CONFIRMED' : camp.status,
  }
}

export function approveTokenReopenPatch(): Partial<Camp> {
  return { tokenActivatedAt: new Date().toISOString() }
}

export function reopenRequestDecisionPatch(camp: Camp, decision: 'APPROVED' | 'DENIED', by: string, denialReason?: string): Partial<Camp> {
  const requests = arr(camp.reopenRequests).map((r) =>
    r.status === 'PENDING' ? { ...r, status: decision, decidedAt: new Date().toISOString(), decidedBy: by, ...(denialReason ? { denialReason } : {}) } : r
  )
  return decision === 'APPROVED'
    ? { reopenRequests: requests, tokenActivatedAt: new Date().toISOString() }
    : { reopenRequests: requests }
}
