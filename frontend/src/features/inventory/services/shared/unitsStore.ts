// Shared qms.inventory.units localStorage accessor. Both fleet.service.ts
// (seedUnits/markCalibrated) and movement.service.ts (logMovement) mutate
// this SAME store — extracted here (rather than duplicated, or importing
// one domain file from the other) to avoid a fleet↔movement import cycle,
// since fleet.service.ts already needs movement.service.ts's movement log
// for markCalibrated(). Moved verbatim out of the original
// inventory.service.ts — no behavior change.

import type { InventoryUnit } from '@/features/inventory/inventory.types'

const UNITS_STORAGE_KEY = 'qms.inventory.units'

export function loadUnitsStore(): InventoryUnit[] | null {
  try {
    const raw = localStorage.getItem(UNITS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? (parsed as InventoryUnit[]) : null
  } catch {
    return null
  }
}
export function persistUnitsStore(units: InventoryUnit[]): void {
  try {
    localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units))
  } catch {
    // localStorage unavailable (e.g. private mode) — mock feature degrades to in-memory only.
  }
}
