// Dietitian↔camp matching — the "nearest location + last-positive-feedback"
// ranker, doctor-preference history, and the per-camp feedback lookup the
// ranker scores on.
//
// Owns no store of its own: it ranks the roster (dietitianRoster.service)
// using ratings carried on the Camp records themselves.

import type { Camp } from '@/features/camps/camp.types'
import type { DietitianRankResult, DietitianRosterEntry } from '@/features/diet/dietitians.types'
import { dietitianRoster } from './dietitianRoster.service'

/**
 * One pass over the camp list, bucketing every assigned Diet camp by its
 * dietitian. Every per-dietitian camp question below (last feedback, doctor
 * history, ratings) is answered from this map instead of re-scanning the whole
 * array once per dietitian, which is what turned these lookups into an O(D×C)
 * cost inside picker row loops.
 */
export function groupDietCampsByDietitian(camps: Camp[]): Map<string, Camp[]> {
  const map = new Map<string, Camp[]>()
  camps.forEach((c) => {
    if (c.type !== 'Diet' || !c.dietitianId) return
    const list = map.get(c.dietitianId)
    if (list) list.push(c)
    else map.set(c.dietitianId, [c])
  })
  return map
}

/** Indexed twin of dietitianLastFeedback — same rule over one dietitian's camps. */
export function lastFeedbackFrom(dietitianCamps: Camp[]): { campId: string; overall: number; positive: boolean } | null {
  const closed = dietitianCamps
    .filter((c) => c.status === 'CLOSED' && c.rating)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  if (!closed.length) return null
  const overall = Number(closed[0].rating?.overall || 0)
  return { campId: closed[0].id, overall, positive: overall >= 4 }
}

// dietitianLastFeedback() — most recent CLOSED camp with a rating, "positive"
// = overall >= 4. om-data.js:538-546.
export function dietitianLastFeedback(dietitianId: string, camps: Camp[]): { campId: string; overall: number; positive: boolean } | null {
  return lastFeedbackFrom(camps.filter((c) => c.type === 'Diet' && c.dietitianId === dietitianId))
}

/**
 * Indexed twin of rankDietitiansForCamp — identical score formula and
 * ordering, but the roster and the per-dietitian camp buckets are supplied by
 * the caller so a loop over many camps parses the roster once, not once per camp.
 */
export function rankDietitiansFrom(camp: Camp, pool: DietitianRosterEntry[], campsByDietitian: Map<string, Camp[]>): DietitianRankResult[] {
  if (!pool.length) return []
  const cCity = String(camp.city || '').toLowerCase().trim()
  return pool
    .map((d) => {
      const dHq = String(d.hq || '').toLowerCase().trim()
      let score = 0
      const reasons: string[] = []
      if (cCity && dHq && dHq === cCity) {
        score -= 100
        reasons.push(`Nearest — same city as camp (${d.hq})`)
      } else if (cCity && dHq) {
        score -= 10
        reasons.push(`Different city (${d.hq} → ${camp.city})`)
      }
      const fb = lastFeedbackFrom(campsByDietitian.get(d.id) ?? [])
      if (fb) {
        if (fb.positive) { score -= 50; reasons.push(`Positive last feedback (${fb.overall}/5)`) }
        else { score += 20; reasons.push(`Last feedback below threshold (${fb.overall}/5)`) }
      } else {
        reasons.push('No prior camp history')
      }
      return { dietitian: d, score, reasons }
    })
    .sort((a, b) => a.score - b.score)
}

// rankDietitiansForCamp() — exact score formula, lower = better.
// Same-city: -100. Different-city (both have city data): -10. No city data: 0.
// Positive last feedback: -50. Below-threshold feedback: +20. No history: 0.
// om-data.js:547-566. Delegates so there is ONE implementation of the formula.
export function rankDietitiansForCamp(camp: Camp, camps: Camp[]): DietitianRankResult[] {
  return rankDietitiansFrom(camp, dietitianRoster(), groupDietCampsByDietitian(camps))
}

// doctorPreferredDietitians — dietitians with the most camps for this doctor.
// om-data.js:1251-1268 counts/dates over ALL matching Diet camps regardless of
// status (no CLOSED filter) — do not add one here.
export function doctorPreferredDietitians(doctorId: string, camps: Camp[]): string[] {
  const counts = new Map<string, number>()
  camps
    .filter((c) => c.type === 'Diet' && c.doctorId === doctorId && c.dietitianId)
    .forEach((c) => counts.set(c.dietitianId as string, (counts.get(c.dietitianId as string) ?? 0) + 1))
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

/** Indexed twin of dietitianDoctorHistory — over one dietitian's camps. */
export function doctorHistoryFrom(dietitianCamps: Camp[], doctorId: string): { count: number; lastDate: string | null } {
  const matches = dietitianCamps.filter((c) => c.doctorId === doctorId)
  if (!matches.length) return { count: 0, lastDate: null }
  const lastDate = matches.reduce((max, c) => (c.date > max ? c.date : max), matches[0].date)
  return { count: matches.length, lastDate }
}

export function dietitianDoctorHistory(dietitianId: string, doctorId: string, camps: Camp[]): { count: number; lastDate: string | null } {
  return doctorHistoryFrom(camps.filter((c) => c.type === 'Diet' && c.dietitianId === dietitianId), doctorId)
}
