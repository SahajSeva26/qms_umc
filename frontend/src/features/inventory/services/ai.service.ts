// AI (Copilot) domain service — the 9 natural-language Q&A cards on the
// Copilot tab. Split out of the original inventory.service.ts (Phase 3
// service breakup) — every function below is moved verbatim, no behavior
// change.

import type { Person } from '@/types/people.types'
import type {
  InventoryItem, FoHoldings, InventoryUnit, ForecastRow, CampReadinessScore,
} from '@/features/inventory/inventory.types'
import { getPriceHistory, consumableItems, getItems, expiryBand, allFos } from './inventory.service'
import { deviceFleet } from './fleet.service'
import { foHoldings } from './fieldops.service'
import { upcomingCamps, campReadiness, forecast } from './forecasting.service'
import { calibDue } from './dashboard.service'

// ============================================================================
// Copilot tab (window.QMS_InvIntel.tabCopilot()/cheapestVendor()/
// balancingSuggestions()/idleAssets(), inventory-intel.js lines 396-446) — 9
// natural-language Q&A cards, each answer computed fresh (no caching) from
// the same shared stores every other tab reads. Cards 1/3/5/8/9 reuse
// forecast()/campReadiness()/calibDue() verbatim; cheapestVendor()/
// idleAssets()/copilotBalancingSuggestions() are net-new (no other tab needed
// them). NOTE: inventory-intel.js's own local balancingSuggestions() (used
// ONLY by this Copilot card 6) is a DIFFERENT function from
// inventory-warehouse.js's balancingSuggestions() already ported above for
// the Transfers tab — same name, different shape/cap math (this one returns
// {item,qty,fromName} capped at reorderLevel−qtyOnHand; the Transfers one
// returns {item,need,suggestion} capped at 2×reorderLevel) — kept as two
// separate exported functions, not unified, to stay an exact port of each
// prototype file's own independent implementation.
// ============================================================================

// cheapestVendor() — exact port (inventory-intel.js:422-428). Groups
// priceHist() rows by vendor, averages `landed` (landed cost) per group,
// keeps the vendor with the LOWEST average. Returns null when there's no
// price history at all.
export interface CheapestVendorResult {
  vendor: string
  avg: number
  n: number
}
export function cheapestVendor(): CheapestVendorResult | null {
  const byVendor = new Map<string, { sum: number; n: number }>()
  getPriceHistory().forEach((r) => {
    const cur = byVendor.get(r.vendor) ?? { sum: 0, n: 0 }
    cur.sum += r.landed || 0
    cur.n += 1
    byVendor.set(r.vendor, cur)
  })
  let best: CheapestVendorResult | null = null
  byVendor.forEach((v, vendor) => {
    const avg = v.sum / Math.max(1, v.n)
    if (!best || avg < best.avg) best = { vendor, avg: Math.round(avg), n: v.n }
  })
  return best
}

// copilotBalancingSuggestions() — exact port of inventory-intel.js:429-439
// (Copilot card 6 ONLY — see the section-header note above on why this is a
// separate function from the Transfers tab's balancingSuggestions()). For
// each central-stock item at/below its reorder level, scans every active FO's
// foHoldings() for a matching consumable with qty>4, keeps the FO holding the
// MOST of it as the donor, and caps the suggested transfer qty at
// min(donor's qty, max(1, reorderLevel − qtyOnHand)) — a smaller/different
// cap than the Transfers tab's own 2×reorderLevel formula. Requires a real
// foHoldings() engine (now available via the FO Inventory tab) — returns []
// if none is supplied, matching the prototype's own `if (!masters() ||
// !masters().foHoldings) return []` guard.
export interface CopilotBalancingSuggestion {
  item: InventoryItem
  qty: number
  fromName: string
}
export function copilotBalancingSuggestions(
  foHoldingsFn: ((personId: string) => FoHoldings | undefined) | undefined,
  people: Person[],
): CopilotBalancingSuggestion[] {
  if (!foHoldingsFn) return []
  const low = consumableItems().filter((c) => (c.qtyOnHand || 0) <= (c.reorderLevel || 0))
  const out: CopilotBalancingSuggestion[] = []
  low.forEach((it) => {
    type Best = { fromName: string; qty: number }
    let best: Best | undefined
    allFos(people).forEach((fo) => {
      const h = foHoldingsFn(fo.id)
      const c = (h?.consumables || []).find((x) => x.item.id === it.id)
      if (c && c.qty > 4 && (!best || c.qty > best.qty)) best = { fromName: fo.name, qty: c.qty }
    })
    const chosen: Best | undefined = best
    if (chosen) {
      out.push({ item: it, qty: Math.min(chosen.qty, Math.max(1, (it.reorderLevel || 0) - (it.qtyOnHand || 0))), fromName: chosen.fromName })
    }
  })
  return out
}

// idleAssets() — exact port (inventory-intel.js:440-446). Per catalog Device
// TYPE (an item-master row with itemType==='Device'), rolls up its fleet
// units via the shared deviceFleet() engine (total/deployed over non-retired
// units), computes pct = round(deployed/total*100) (0 when the device has no
// seeded units at all), filters to pct<40 (under-40%-deployed device types),
// sorted ascending by pct (most-idle first).
export interface IdleAssetRow {
  it: InventoryItem
  pct: number
}
export function idleAssets(units: InventoryUnit[]): IdleAssetRow[] {
  return getItems()
    .filter((it) => it.itemType === 'Device')
    .map((it) => {
      const fleet = deviceFleet(units, it.sourceId || '')
      const pct = fleet.total ? Math.round((fleet.deployed / fleet.total) * 100) : 0
      return { it, pct }
    })
    .filter((r) => r.pct < 40)
    .sort((a, b) => a.pct - b.pct)
}

// tabCopilot() — exact port (inventory-intel.js:396-421). Bundles all 9
// cards' computed data in one call (component/hook only formats the prose +
// wires the deep-links) — every sub-computation here is one of the exact
// ports declared above, re-run fresh with no caching, matching the
// prototype's own "always recompute on tab entry" behavior.
export interface CopilotData {
  expiring: { it: InventoryItem; band: NonNullable<ReturnType<typeof expiryBand>> }[]
  foExcess: { fo: Person; holdings: FoHoldings } | null
  campsAtRisk: { c: ReturnType<typeof upcomingCamps>[number]; r: CampReadinessScore }[]
  cheapest: CheapestVendorResult | null
  shortages30: ForecastRow[]
  balancing: CopilotBalancingSuggestion[]
  idle: IdleAssetRow[]
  calib: InventoryUnit[]
  forecast180: ForecastRow[]
  procureVal180: number
}

export function buildCopilotData(units: InventoryUnit[], people: Person[]): CopilotData {
  // Card 1 — expiring items: EXPIRED/RED/ORANGE bands (<90d incl. already
  // expired), ascending by days-remaining.
  const expiring = consumableItems()
    .map((it) => ({ it, band: expiryBand(it.expiryDate) }))
    .filter((x): x is { it: InventoryItem; band: NonNullable<ReturnType<typeof expiryBand>> } => !!x.band && (x.band.css === 'red' || x.band.css === 'orange'))
    .sort((a, b) => a.band.days - b.band.days)

  // Card 2 — FO with the most field-holding value.
  const foRanked = allFos(people)
    .map((fo) => ({ fo, holdings: foHoldings(fo.id, units, people) }))
    .sort((a, b) => b.holdings.totalValue - a.holdings.totalValue)
  const foExcess = foRanked[0] || null

  // Card 3 — upcoming camps below 70% readiness (the 'red' band boundary),
  // worst-first.
  const campsAtRisk = upcomingCamps()
    .map((c) => ({ c, r: campReadiness(c) }))
    .filter((x) => x.r.score < 70)
    .sort((a, b) => a.r.score - b.r.score)

  // Card 4 — cheapest vendor by average landed cost.
  const cheapest = cheapestVendor()

  // Card 5 — 30-day shortages (own hardcoded window, independent of the
  // Forecast tab's own window selector).
  const shortages30 = forecast(30).filter((r) => r.shortage > 0)

  // Card 6 — transfer-balancing suggestions (Copilot's own local variant —
  // see copilotBalancingSuggestions()'s header comment).
  const balancing = copilotBalancingSuggestions((foId) => foHoldings(foId, units, people), people)

  // Card 7 — idle (under-40%-deployed) device types.
  const idle = idleAssets(units)

  // Card 8 — units due/overdue for calibration within 14 days.
  const calib = calibDue(units)

  // Card 9 — 180-day full forecast (unfiltered by shortage) + projected
  // procurement value across it.
  const forecast180 = forecast(180)
  const procureVal180 = forecast180.reduce((a, r) => a + (r.procure || 0) * (r.it.purchaseCost || 0), 0)

  return { expiring, foExcess, campsAtRisk, cheapest, shortages30, balancing, idle, calib, forecast180, procureVal180 }
}
