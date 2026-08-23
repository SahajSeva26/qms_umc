// Dietitian remuneration — per-dietitian rate history, the suggested-rates
// defaults for the rate sheet, the per-camp expense calculation, and the
// PO-budgeted camp cost it is compared against.
//
// Owns KEYS.RATE_HISTORY.
// TODO: mock/localStorage-backed — swap bodies for api.* when available.

import type { Camp } from '@/features/camps/camp.types'
import { PROJECTS } from '@/types/client.mock'
import type { DietitianRateEntry, DietitianExpense } from '@/features/diet/dietitians.types'
import { KEYS, load, persist, num, seeded } from './dietStorage'
import { dietitianById, dietitianDetails } from './dietitianRoster.service'

export function loadRateHistory(): Record<string, DietitianRateEntry[]> {
  return load(KEYS.RATE_HISTORY, {} as Record<string, DietitianRateEntry[]>)
}

export function getDietitianRateHistory(dietitianId: string): DietitianRateEntry[] {
  return loadRateHistory()[dietitianId] ?? []
}

export function getLastDietitianRates(dietitianId: string): DietitianRateEntry | null {
  const h = getDietitianRateHistory(dietitianId)
  return h.length ? h[0] : null
}

export async function recordDietitianRates(dietitianId: string, entry: Omit<DietitianRateEntry, 'setAt'>): Promise<DietitianRateEntry[]> {
  const all = loadRateHistory()
  const list = all[dietitianId] ?? []
  const next = [{ ...entry, setAt: new Date().toISOString() }, ...list].slice(0, 50)
  all[dietitianId] = next
  persist(KEYS.RATE_HISTORY, all)
  return next
}

// suggestDietitianRates() — defaults for the rates form: prior rate history
// wins, else master/detail defaults, else a seeded first-time baseline.
export function suggestDietitianRates(dietitianId: string, camp: Camp): { hasHistory: boolean; remuneration: number; ta: number; printing: number; targetCost: number } {
  const last = getLastDietitianRates(dietitianId)
  const det = dietitianDetails(dietitianId)
  const d = dietitianById(dietitianId)
  const rng = seeded(camp.id + '|diet-rem')
  const travelKm = typeof camp.foDistanceKm === 'number' ? camp.foDistanceKm : Math.round(8 + rng() * 50)
  const travel = Math.round(travelKm * 9)
  return {
    hasHistory: !!last,
    remuneration: num(last?.remuneration, d?.ratePerCamp, 2500 + Math.round(rng() * 1500)),
    ta: num(last?.ta, travel),
    printing: num(last?.printing, det.printingChargePerCamp, 150),
    targetCost: num(last?.targetCost, det.targetCostPerCamp, 0),
  }
}

// ── Per-camp expense ─────────────────────────────────────────────────────
//
// dietitianExpense() reads three stores per call. The rollup path in
// dietitianPayment.service.ts calls dietitianExpenseFrom() with a pre-built
// index instead — same formula, no repeated parsing. The single-shot version
// delegates so there is exactly ONE implementation of the fallback chain.

/** The pre-loaded lookups dietitianExpenseFrom() needs. */
export interface DietitianExpenseSources {
  detailsById: Record<string, { printingChargePerCamp?: number }>
  ratesById: Record<string, DietitianRateEntry[]>
  rosterById: Map<string, { ratePerCamp: number }>
}

// dietitianExpense() — exact priority-fallback chain. total = base + ta + printing
// (travel is a fallback source for ta, not independently added). om-data.js:740-767.
export function dietitianExpenseFrom(camp: Camp, ix: DietitianExpenseSources): DietitianExpense {
  const rng = seeded(camp.id + '|diet-rem')
  const det = camp.dietitianId ? (ix.detailsById[camp.dietitianId] ?? {}) : {}
  const d = camp.dietitianId ? ix.rosterById.get(camp.dietitianId) : undefined
  const history = camp.dietitianId ? (ix.ratesById[camp.dietitianId] ?? []) : []
  const last = history.length ? history[0] : null
  const rates = camp.dietitianRates ?? {}
  const travelKm = typeof camp.foDistanceKm === 'number' ? camp.foDistanceKm : Math.round(8 + rng() * 50)
  const travel = Math.round(travelKm * 9)
  const base = num(rates.remuneration, last?.remuneration, d?.ratePerCamp, 2500 + Math.round(rng() * 1500))
  const ta = num(rates.ta, camp.taAmount, last?.ta, travel)
  const printing = num(rates.printing, last?.printing, det.printingChargePerCamp, 150)
  return { base, travel, ta, printing, travelKm: Math.round(travelKm), total: base + ta + printing }
}

export function dietitianExpense(camp: Camp): DietitianExpense {
  const d = camp.dietitianId ? dietitianById(camp.dietitianId) : undefined
  const rosterById = new Map<string, { ratePerCamp: number }>()
  if (camp.dietitianId && d) rosterById.set(camp.dietitianId, d)
  return dietitianExpenseFrom(camp, {
    detailsById: camp.dietitianId ? { [camp.dietitianId]: dietitianDetails(camp.dietitianId) } : {},
    ratesById: camp.dietitianId ? { [camp.dietitianId]: getDietitianRateHistory(camp.dietitianId) } : {},
    rosterById,
  })
}

// poCampCost() — the per-camp PO-budgeted value from the linked project.
// diet-rates-modal.js:170-185.
export function poCampCost(camp: Camp): number {
  const proj = PROJECTS.find((p) => p.id === camp.projectId)
  if (!proj) return 0
  if (typeof proj.campCost === 'number' && proj.campCost > 0) return proj.campCost
  if (proj.poValueInr && proj.campsTarget) return Math.round(proj.poValueInr / proj.campsTarget)
  return 0
}
