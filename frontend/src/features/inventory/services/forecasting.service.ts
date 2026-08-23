// Forecasting domain service — demand forecast, camp consumption lines,
// camp readiness scoring, and the Camp Consumption Engine (consumed-camps
// idempotency ledger + applyConsumption() mutation). Split out of the
// original inventory.service.ts (Phase 3 service breakup) — every function
// below is moved verbatim, no behavior change.

import type { Person } from '@/types/people.types'
import { CAMPS } from '@/features/camps/camp.types'
import type {
  InventoryItem, ForecastRow, CampReadinessScore, ReadinessBand, InventoryUnit,
} from '@/features/inventory/inventory.types'
import { isoDate } from './shared/date'
import { getConsumables, consumableItems, getItems, saveAllItems } from './inventory.service'
import { getTransfers } from './movement.service'
import { loadReportsStore, persistReportsStore, foConsumableHoldings } from './fieldops.service'

// qpp() — exact port (inventory-intel.js:46). Looks up the ORIGINAL
// CONSUMABLES catalog (not the item-master row) by the item's sourceId for
// qtyPerPatient, defaulting to 0.05 when no match (e.g. General
// Consumable/Marketing Material/asset rows whose sourceId is '' or unmapped).
function qpp(it: InventoryItem): number {
  const c = getConsumables().find((x) => x.id === it.sourceId)
  return c ? c.qtyPerPatient || 0 : 0.05
}
// camps() (Dashboards' own full-shape view) — exact port of
// inventory-intel.js:32's fallback branch, reusing the same Camp[] mock
// roster as the Transfers tab's narrower camps() helper above (see that
// function's comment) — this Dashboards section needs the FULL Camp shape
// (date/status/city/foId/devicesAllocated/type), not just the patient-count
// slice, so it declares its own typed accessor rather than reusing the
// narrower one.
// Exported — dashboard.service.ts's logisticsRollup()/buildDashboardKpis()
// need the same full-shape camp accessor.
export function dashCamps() {
  return CAMPS
}

// upcomingCamps() — exact port (inventory-intel.js:60-63). today-or-later,
// excluding any status containing "CANCEL" (regex /CANCEL/, matches both
// CANCELLED and CANCELLED_CHARGED) and excluding CLOSED.
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
export function upcomingCamps(): typeof CAMPS {
  const t = todayIso()
  return dashCamps().filter((c) => (c.date || '') >= t && !/CANCEL/.test(c.status || '') && c.status !== 'CLOSED')
}

// campUsesItem() — exact port (inventory-intel.js:64-68). General
// Consumable always applies; a linked-device consumable applies only if its
// linkedDeviceId is among the camp's devicesAllocated[].
function campUsesItem(c: (typeof CAMPS)[number], it: InventoryItem): boolean {
  if (it.itemType === 'General Consumable') return true
  if (it.linkedDeviceId) return (c.devicesAllocated || []).includes(it.linkedDeviceId)
  return false
}

// forecast(windowDays) — exact port (inventory-intel.js:70-79). Sorted by
// shortage DESC, filtered to required>0.
export function forecast(windowDays: number): ForecastRow[] {
  const t = Date.now()
  const inWin = upcomingCamps().filter((c) => {
    const d = (new Date(c.date).getTime() - t) / 86400000
    return d <= windowDays
  })
  return consumableItems()
    .map((it) => {
      const required = Math.round(inWin.reduce((a, c) => a + (campUsesItem(c, it) ? (c.patientsExpected || 0) * qpp(it) : 0), 0))
      const available = it.qtyOnHand || 0
      const shortage = Math.max(0, required - available)
      const procure = shortage ? Math.max(shortage, it.reorderLevel || 0) : 0
      return { it, required, available, shortage, procure, camps: inWin.length }
    })
    .filter((r) => r.required > 0)
    .sort((a, b) => b.shortage - a.shortage)
}

// campConsumptionLines() — exact port (inventory-intel.js:82-89). +5%
// wastage, ceil-rounded qty. Exported (not just used internally by
// campReadiness()) — the Forecast tab's Camp Consumption Engine sub-view
// renders this same per-SKU line list for the operator-selected camp.
export interface CampConsumptionLine {
  it: InventoryItem
  patients: number
  /** qpp(it) — the raw (pre-wastage) per-patient usage rate, exposed
   * separately since the Forecast tab's "Per patient" column renders it on
   * its own (distinct from `qty`, the wastage-adjusted deduction). */
  perPatient: number
  qty: number
  value: number
}
export function campConsumptionLines(c: (typeof CAMPS)[number]): CampConsumptionLine[] {
  const patients = c.patientsDone || c.patientsExpected || 0
  return consumableItems()
    .filter((it) => campUsesItem(c, it))
    .map((it) => {
      const perPatient = qpp(it)
      const base = patients * perPatient
      const qty = Math.ceil(base * 1.05)
      return { it, patients, perPatient, qty, value: qty * (it.purchaseCost || 0) }
    })
    .filter((l) => l.qty > 0)
}

// campReadiness() — exact port (inventory-intel.js:92-103). Weighted score:
// manpower .20 · devices .25 · consumables .25 · logistics .15 · approvals .15.
export function campReadiness(c: (typeof CAMPS)[number]): CampReadinessScore {
  const manpower = c.foId ? 1 : 0
  const devices = (c.devicesAllocated || []).length ? 1 : c.type === 'Diet' ? 1 : 0.4
  const lines = campConsumptionLines(c)
  const consumables = lines.length
    ? lines.reduce((a, l) => a + Math.min(1, (l.it.qtyOnHand || 0) / Math.max(1, l.qty)), 0) / lines.length
    : 1
  const delivered = getTransfers().some((tr) => tr.status === 'DELIVERED' && tr.to === 'FO:' + c.foId)
  const logistics = c.foId ? (delivered ? 1 : 0.7) : 0.4
  const approvals = c.status === 'CONFIRMED' || c.status === 'LIVE' ? 1 : c.status === 'REQUESTED' ? 0.4 : 0.2
  const score = Math.round((manpower * 0.2 + devices * 0.25 + consumables * 0.25 + logistics * 0.15 + approvals * 0.15) * 100)
  const band: ReadinessBand = score >= 90 ? 'green' : score >= 70 ? 'amber' : 'red'
  return { score, band, manpower, devices, consumables, logistics, approvals }
}
// ============================================================================
// Forecast tab (window.QMS_InvIntel.tabForecast()/viewDemand()/
// viewConsumption(), inventory-intel.js lines 318-393) — the Demand forecast
// sub-view reuses forecast()/upcomingCamps() declared above verbatim; this
// section adds the Camp Consumption Engine's own bits: the consumed-camps
// idempotency ledger, the camp-select list (non-cancelled, date-desc), the
// inrShort(totProcure) filter-bar summary, and the applyConsumption()
// mutation + runAutoReorder() delegation.
// ============================================================================

const CONSUMED_CAMPS_STORAGE_KEY = 'qms.inventory.consumed'

// consumedCamps()/persistStore('consumed', ...) — exact port (inventory-
// intel.js:90, 391). Flat array of camp-id strings, pure idempotency guard.
export function consumedCamps(): string[] {
  try {
    const raw = localStorage.getItem(CONSUMED_CAMPS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function persistConsumedCamps(ids: string[]): void {
  try {
    localStorage.setItem(CONSUMED_CAMPS_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // localStorage unavailable (e.g. private mode) — mock feature degrades to in-memory only.
  }
}

// Camp Consumption Engine's <select> list — exact port of viewConsumption()'s
// camp-picker source (inventory-intel.js:352): every non-cancelled camp
// (status NOT containing "CANCEL"; CLOSED camps ARE still selectable here,
// unlike upcomingCamps()'s own filter — the Consumption engine is meant to
// cover camps that already ran), sorted by date descending (most recent
// first).
export function consumptionCamps(): typeof CAMPS {
  return [...dashCamps()]
    .filter((c) => !/CANCEL/.test(c.status || ''))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

// totProcure — exact port of viewDemand()'s inline reduce (inventory-intel.js
// :331): sum of procure×purchaseCost over forecast(win) rows.
export function totalProcureCost(rows: ForecastRow[]): number {
  return rows.reduce((a, r) => a + r.procure * (r.it.purchaseCost || 0), 0)
}

// applyConsumption(campId) — exact port of inventory-intel.js:374-393.
// Mutation order: (1) for each consumption line, deduct from the FO's field
// stock ONLY if the camp has a foId AND that FO's own foConsumableHoldings()
// already carries a qty>0 row for this item (i.e. the FO demonstrably holds
// the SKU) — else deduct from the central items() store's qtyOnHand (floored
// at 0). NOTE: this build has no allocation-ledger MUTATOR yet (no
// window.QMS_InvField.adjustAllocation equivalent — foHoldings()/
// foConsumableHoldings() above are read-only derivations over the
// qms.inventory.allocations ledger), so the "deduct from field" branch is
// unreachable in practice today and every deduction currently lands on
// central stock — exact same degrade-to-central behavior already established
// by dispatchTransfer()/saveDeliver() above for the identical "Field module
// not wired yet" gap. (2) unshifts one synthetic 'CONSUMPTION' field-report
// row per SKU line onto the shared reports() store (id pattern
// 'FR-cons-{campId}-{last4ofitemId}'). (3) marks the camp id into
// consumedCamps(). Throws if already consumed (caller surfaces the "Already
// consumed" info toast and no-ops, matching the prototype's own guard).
export function applyConsumption(campId: string, units: InventoryUnit[], people: Person[]): { skuCount: number } {
  const already = consumedCamps()
  if (already.includes(campId)) throw new Error('ALREADY_CONSUMED')

  const camp = dashCamps().find((c) => c.id === campId)
  if (!camp) throw new Error('Camp not found')

  const lines = campConsumptionLines(camp)
  const holder = camp.foId ? 'FO:' + camp.foId : 'CENTRAL'

  const items = getItems()
  const foHeld = camp.foId ? foConsumableHoldings(camp.foId, units, people) : []

  const reports = loadReportsStore()?.rows ?? []
  const patientsForReason = camp.patientsDone || camp.patientsExpected || 0

  lines.forEach((l) => {
    const heldByFo = camp.foId ? foHeld.find((h) => h.item.id === l.it.id && h.qty > 0) : undefined
    if (!heldByFo) {
      // Central deduction (also the de-facto path for the FO branch today —
      // see the function-level note above on the missing allocation mutator).
      const it = items.find((x) => x.id === l.it.id)
      if (it) it.qtyOnHand = Math.max(0, (it.qtyOnHand || 0) - l.qty)
    }
    reports.unshift({
      id: 'FR-cons-' + campId + '-' + l.it.id.slice(-4),
      date: isoDate(new Date()),
      holder,
      itemId: l.it.id,
      itemName: l.it.name,
      uom: l.it.uom || '',
      qty: l.qty,
      type: 'CONSUMPTION',
      reason: `Camp ${campId} · ${patientsForReason} patients`,
      status: 'REPORTED',
    })
  })

  saveAllItems(items)
  persistReportsStore(reports)
  persistConsumedCamps([...already, campId])

  return { skuCount: lines.length }
}

// runAutoReorder() — exact port of inventory-intel.js:349. Pure delegation:
// this build has no Procurement-tab autoReorder() entry point yet (no
// window.QMS_InvProc.autoReorder equivalent exists in this service), so the
// call always degrades to the "module not loaded" branch — exact port of
// that guard, not a fabricated success path.
export function runAutoReorder(): { ok: boolean } {
  return { ok: false }
}
