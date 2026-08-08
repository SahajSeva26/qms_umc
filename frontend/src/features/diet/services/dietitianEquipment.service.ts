// BCA (Body Composition Analyzer) equipment — ownership, verification and
// stock-movement log per dietitian, plus the camp-side "does this camp need
// a BCA scale" rules that gate assignment.
//
// Owns KEYS.EQUIPMENT.
// TODO: mock/localStorage-backed — swap bodies for api.* when available.

import type { Camp } from '@/types/camp.types'
import type { DietitianBcaEquipment, DietitianRankResult } from '@/features/diet/dietitians.types'
import { KEYS, load, persist, arr } from './dietStorage'

export function campRequiresBca(camp: Camp): boolean {
  const tests = arr(camp.tests).concat(arr(camp.testsConducted))
  return tests.some((t) => /\bBCA\b|body\s*comp|composition|fat\s*analys/i.test(String(t)))
}

function loadEquipment(): Record<string, DietitianBcaEquipment> {
  return load(KEYS.EQUIPMENT, {} as Record<string, DietitianBcaEquipment>)
}

const DEFAULT_BCA: DietitianBcaEquipment = { owned: false, verified: false, verifiedAt: null, verifiedBy: null, videoUrl: '', stockMovements: [] }

/**
 * The whole equipment store in one parse — for callers that need many
 * dietitians' BCA status at once (pickers, BCA-tier sorting). Pair with
 * equipmentFrom() so the default-record rule has one implementation.
 */
export function loadEquipmentMap(): Record<string, DietitianBcaEquipment> {
  return loadEquipment()
}

export function equipmentFrom(id: string, map: Record<string, DietitianBcaEquipment>): DietitianBcaEquipment {
  return map[id] ?? { ...DEFAULT_BCA }
}

export function getDietitianEquipment(id: string): DietitianBcaEquipment {
  return equipmentFrom(id, loadEquipment())
}

export function dietitianHasBca(id: string): boolean {
  return getDietitianEquipment(id).owned
}

export function bcaVerified(id: string): boolean {
  return getDietitianEquipment(id).verified
}

function persistEquipment(id: string, eq: DietitianBcaEquipment) {
  const all = loadEquipment()
  all[id] = eq
  persist(KEYS.EQUIPMENT, all)
}

export async function requestBcaScale(id: string, by: string): Promise<DietitianBcaEquipment> {
  const eq = getDietitianEquipment(id)
  const next: DietitianBcaEquipment = {
    ...eq, owned: false, verified: false, requestedAt: new Date().toISOString(), requestedBy: by,
    stockMovements: [{ at: new Date().toISOString(), by, action: 'BCA scale requested · awaiting allocation' }, ...arr(eq.stockMovements)],
  }
  persistEquipment(id, next)
  return next
}

export async function verifyBcaScale(id: string, opts: { videoUrl?: string }, by: string): Promise<DietitianBcaEquipment> {
  const eq = getDietitianEquipment(id)
  const next: DietitianBcaEquipment = {
    ...eq, owned: true, verified: true, verifiedAt: new Date().toISOString(), verifiedBy: by,
    videoUrl: opts.videoUrl || eq.videoUrl,
    stockMovements: [{ at: new Date().toISOString(), by, action: 'BCA scale received + trained · verified', videoUrl: opts.videoUrl }, ...arr(eq.stockMovements)],
  }
  persistEquipment(id, next)
  return next
}

export async function logStockMovement(id: string, entry: { action: string; fromLocation?: string; toLocation?: string }, by: string): Promise<DietitianBcaEquipment> {
  const eq = getDietitianEquipment(id)
  const next: DietitianBcaEquipment = {
    ...eq,
    stockMovements: [{ at: new Date().toISOString(), by, action: entry.action, fromLocation: entry.fromLocation, toLocation: entry.toLocation }, ...arr(eq.stockMovements)],
  }
  persistEquipment(id, next)
  return next
}

// sortDietitiansForBcaCamp — 3-tier stable sort: verified(0) < owned-unverified(1) < none(2).
//
// The comparator runs O(n log n) times, so it must NOT re-read the store per
// call: the map is parsed once up front and every tier lookup is O(1) against
// it. (Previously each comparison did two full localStorage reads + JSON.parse,
// which is ~20k parses for a 1,000-dietitian roster.)
export function sortDietitiansForBcaCamp(camp: Camp, ranked: DietitianRankResult[]): DietitianRankResult[] {
  if (!campRequiresBca(camp)) return ranked
  return sortByBcaTier(ranked, loadEquipment())
}

/** Indexed twin — same 3-tier order against an already-loaded equipment map. */
export function sortByBcaTier(ranked: DietitianRankResult[], map: Record<string, DietitianBcaEquipment>): DietitianRankResult[] {
  const tier = (id: string) => {
    const eq = equipmentFrom(id, map)
    return eq.verified ? 0 : eq.owned ? 1 : 2
  }
  return [...ranked].sort((a, b) => tier(a.dietitian.id) - tier(b.dietitian.id))
}

export function campBcaStatus(camp: Camp): 'NA' | 'ORANGE' | 'GREEN' {
  if (!campRequiresBca(camp)) return 'NA'
  if (!camp.dietitianId) return 'ORANGE'
  return bcaVerified(camp.dietitianId) ? 'GREEN' : 'ORANGE'
}
