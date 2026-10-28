// The dietitian shortlist for a camp — ranked, ordered, and annotated with
// every fact the four assign/invite pickers put on a row.
//
// WHY THIS EXISTS
// The pickers used to call one service per fact per row: getLastDietitianRates,
// dietitianAverageRating, bcaVerified/dietitianHasBca and dietitianDoctorHistory.
// Each of those re-reads and re-parses a whole localStorage store (or rescans
// the whole camps array), so rendering the list was ~4 full store parses and
// two O(C) camp scans PER DIETITIAN — on top of a BCA sort whose comparator did
// two more parses per comparison. At the seeded roster size that is invisible;
// at 1,000 dietitians it is tens of thousands of synchronous parses per render.
//
// buildDietitianCandidates() reads each store EXACTLY ONCE, groups the camps
// once, and then answers every row question with an O(1) lookup. The business
// formulas are not reimplemented here — each one delegates to the *From()
// twin that lives beside its single-shot original, so the batch and one-off
// paths can never drift apart (the same convention dietitianPayment.service.ts
// already uses for the payment rollup).
//
// API MIGRATION: this function is the exact shape of a future
// `GET /camps/:id/dietitian-candidates`. When that endpoint lands, only this
// body changes — the DietitianCandidate contract and every consumer stay as
// they are.
//
// SNAPSHOT SEMANTICS: the returned list is a point-in-time read. Nothing a
// picker mutates while it is open (invites, and the assign/rate write that
// closes it) feeds any field below — invites deliberately stay in their own
// `dietKeys.invites` query and are applied on top via applyInviteTierOrder().

import type { Camp } from '@/types/camp.types'
import type {
  DietInvite, DietitianAverageRating, DietitianBcaEquipment, DietitianFeedback,
  DietitianRankResult, DietitianRateEntry, DietitianRosterEntry,
} from '@/features/diet/dietitians.types'
import { campRequiresBca, equipmentFrom, loadEquipmentMap, sortByBcaTier } from './dietitianEquipment.service'
import { averageRatingFrom, loadFeedbackMap } from './dietitianFeedback.service'
import {
  doctorHistoryFrom, doctorPreferredDietitians, groupDietCampsByDietitian, rankDietitiansFrom,
} from './dietitianMatching.service'
import { loadRateHistory } from './dietitianRates.service'
import { dietitianRoster } from './dietitianRoster.service'

/** One row of the picker: the ranked dietitian plus every displayed fact. */
export interface DietitianCandidate extends DietitianRankResult {
  /** This doctor has booked them before (any rank in the preference order). */
  preferred: boolean
  /** They are the doctor's single most-booked dietitian — the "DOCTOR'S PICK" mark. */
  topPreferred: boolean
  /** Mean of all recorded feedback ratings, or null when there is none. */
  rating: DietitianAverageRating | null
  /** Most recent rate-sheet entry, or null on a first assignment. */
  lastRates: DietitianRateEntry | null
  bca: DietitianBcaEquipment
  doctorHistory: { count: number; lastDate: string | null }
}

export interface DietitianCandidateList {
  /** Camp tests include BCA / body composition — drives the BCA column + gate. */
  requiresBca: boolean
  candidates: DietitianCandidate[]
}

/**
 * Every store the shortlist needs, parsed once. Exported so a caller that
 * loops over MANY camps (the Assign tab's card list) builds it a single time
 * instead of once per camp.
 */
export interface DietitianCandidateIndex {
  roster: DietitianRosterEntry[]
  equipmentById: Record<string, DietitianBcaEquipment>
  ratesById: Record<string, DietitianRateEntry[]>
  campsByDietitianId: Map<string, Camp[]>
  feedbackByCampId: Record<string, DietitianFeedback>
}

export function loadCandidateIndex(camps: Camp[]): DietitianCandidateIndex {
  return {
    roster: dietitianRoster(),
    equipmentById: loadEquipmentMap(),
    ratesById: loadRateHistory(),
    campsByDietitianId: groupDietCampsByDietitian(camps),
    feedbackByCampId: loadFeedbackMap(),
  }
}

export interface BuildCandidatesOptions {
  /** Reuse an index across many camps instead of re-reading per camp. */
  index?: DietitianCandidateIndex
  /**
   * Narrow to the top N by ranking SCORE before the BCA re-sort. Only the
   * Assign tab's "AI suggestion" card uses this: it has always considered the
   * 8 best-scoring dietitians and then preferred a BCA-capable one among
   * those, rather than letting a distant BCA owner outrank a local match. The
   * full pickers pass nothing and tier the whole roster, as they always have.
   */
  topByScore?: number
}

/**
 * Ranked shortlist for one camp. Ordering is unchanged from the per-row
 * implementation it replaces: score ascending (nearest city, then positive
 * last feedback), then — only when the camp needs a BCA scale — a stable
 * re-sort putting verified scales first and non-owners last.
 */
export function buildDietitianCandidates(camp: Camp, camps: Camp[], options: BuildCandidatesOptions = {}): DietitianCandidateList {
  const ix = options.index ?? loadCandidateIndex(camps)
  const requiresBca = campRequiresBca(camp)

  const byScore = rankDietitiansFrom(camp, ix.roster, ix.campsByDietitianId)
  const ranked = options.topByScore ? byScore.slice(0, options.topByScore) : byScore
  const ordered = requiresBca ? sortByBcaTier(ranked, ix.equipmentById) : ranked

  // doctorPreferredDietitians() returns ids ordered by camp count for this
  // doctor; the UI marks only the top entry as the DOCTOR'S PICK, while the
  // approvals picker tiers on membership of the whole set.
  const preferenceOrder = doctorPreferredDietitians(camp.doctorId, camps)
  const preferredIds = new Set(preferenceOrder)
  const topPreferredId = preferenceOrder[0]

  const candidates = ordered.map((r): DietitianCandidate => {
    const id = r.dietitian.id
    const myCamps = ix.campsByDietitianId.get(id) ?? []
    const history = ix.ratesById[id] ?? []
    return {
      ...r,
      preferred: preferredIds.has(id),
      topPreferred: topPreferredId === id,
      rating: averageRatingFrom(myCamps, ix.feedbackByCampId),
      lastRates: history.length ? history[0] : null,
      bca: equipmentFrom(id, ix.equipmentById),
      doctorHistory: doctorHistoryFrom(myCamps, camp.doctorId),
    }
  })

  return { requiresBca, candidates }
}

/**
 * Final tier order for the approvals picker: invite-accepted float to the top
 * (0), doctor-preferred next (1), everyone else (2), declined-invite sink to
 * the bottom (3), stable within tiers (spec §3a step 3).
 *
 * Pure — invites are passed in from the `dietKeys.invites` query rather than
 * read from the store, so recording a reply re-orders the list through normal
 * cache invalidation.
 */
export function applyInviteTierOrder(candidates: DietitianCandidate[], invites: DietInvite[]): DietitianCandidate[] {
  const acceptedIds = new Set(invites.filter((i) => i.response === 'ACCEPTED').map((i) => i.dietitianId))
  const declinedIds = new Set(invites.filter((i) => i.response === 'DECLINED').map((i) => i.dietitianId))
  const tier = (c: DietitianCandidate) =>
    acceptedIds.has(c.dietitian.id) ? 0 : c.preferred ? 1 : declinedIds.has(c.dietitian.id) ? 3 : 2
  return candidates
    .map((c, i) => ({ c, i, t: tier(c) }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map((x) => x.c)
}

/** Invite lists keyed by dietitian id — O(1) row lookup instead of .find(). */
export function invitesByDietitianId(invites: DietInvite[]): Map<string, DietInvite> {
  return new Map(invites.map((i) => [i.dietitianId, i]))
}
