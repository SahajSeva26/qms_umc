// Dietitian feedback & ratings — the per-camp feedback records and the
// derived average rating shown on profiles and invite shortlists.
//
// Owns KEYS.FEEDBACK. Distinct from dietitianMatching's dietitianLastFeedback(),
// which scores the rating carried on the Camp record itself — these two read
// different sources by design; do not merge them.
// TODO: mock/localStorage-backed — swap bodies for api.* when available.

import type { Camp } from '@/types/camp.types'
import type { DietitianFeedback, DietitianAverageRating } from '@/features/diet/dietitians.types'
import { KEYS, load } from './dietStorage'

function loadFeedback(): Record<string, DietitianFeedback> {
  return load(KEYS.FEEDBACK, {} as Record<string, DietitianFeedback>)
}

/**
 * The whole feedback store in one parse — for callers that need many
 * dietitians' ratings at once (pickers). Pair with averageRatingFrom().
 */
export function loadFeedbackMap(): Record<string, DietitianFeedback> {
  return loadFeedback()
}

/**
 * Indexed twin of dietitianAverageRating — identical mean, but over an
 * already-filtered camp list and an already-parsed feedback map. Both paths
 * share this body so the formula can never drift.
 */
export function averageRatingFrom(dietitianCamps: Camp[], feedbackByCampId: Record<string, DietitianFeedback>): DietitianAverageRating | null {
  let sum = 0
  let count = 0
  dietitianCamps.forEach((c) => {
    const fb = feedbackByCampId[c.id]
    if (!fb) return
    sum += fb.rating || 0
    count++
  })
  if (!count) return null
  return { avg: +(sum / count).toFixed(1), count }
}

export function dietitianFeedbacks(dietitianId: string, camps: Camp[]): (DietitianFeedback & { camp: Camp })[] {
  const all = loadFeedback()
  const myCamps = camps.filter((c) => c.type === 'Diet' && c.dietitianId === dietitianId)
  const out: (DietitianFeedback & { camp: Camp })[] = []
  myCamps.forEach((c) => {
    const fb = all[c.id]
    if (fb) out.push({ ...fb, camp: c })
  })
  return out.sort((a, b) => (b.at || '').localeCompare(a.at || ''))
}

// dietitianAverageRating() — simple mean of all feedback ratings, rounded to
// 1 decimal. Returns null (chip omitted) if there's no feedback at all.
export function dietitianAverageRating(dietitianId: string, camps: Camp[]): DietitianAverageRating | null {
  const f = dietitianFeedbacks(dietitianId, camps)
  if (!f.length) return null
  const avg = f.reduce((s, x) => s + (x.rating || 0), 0) / f.length
  return { avg: +avg.toFixed(1), count: f.length }
}
