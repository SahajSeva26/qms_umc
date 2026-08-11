// Dashboard domain service — Overview tab KPIs/AI summary/fleet-by-type/
// status-mix, and the Dashboards tab's synthesis-layer computations
// (valuation/logistics/price alerts/calibration due/ranked vendors/per-
// sub-view KPI cards). Split out of the original inventory.service.ts
// (Phase 3 service breakup) — every function below is moved verbatim, no
// behavior change.

import type { Person } from '@/types/people.types'
import type {
  InventoryUnit, InventoryKpiCard, FleetByTypeRow, ConsumableStatusMix, Consumable, InventoryItem,
  InventoryValuation, LogisticsRollup, PriceAlert, RankedVendor, ForecastRow, CampReadinessScore,
  PurchaseOrder, PurchaseRequisition, GoodsReceiptNote, RefillRequest, FieldReport, Transfer,
  DashboardKpiCard, DashboardSubView, FoHoldings, PriceHistoryRow,
} from '@/features/inventory/inventory.types'
import { isAssetType } from '@/features/inventory/inventory.types'
import { daysFromNow } from './shared/date'
import {
  getDeviceCatalog, getConsumables, consumableStatus, inrShort, inr, getItems, consumableItems,
  expiryBand, itemById, getVendors, getPriceHistory, allFos,
} from './inventory.service'
import { calibStatus } from './fleet.service'
import { getTransfers } from './movement.service'
import { getFieldReports, getRefills } from './fieldops.service'
import { getPos, getPrs, getGrns, poTotal } from './procurement.service'
import { forecast, upcomingCamps, campReadiness, dashCamps } from './forecasting.service'

// ============================================================================
// Overview tab (renderKpis()/renderAi()/tabOverview() — inventory.js lines
// 321-520). Reuses the canonical seedUnits()/calibStatus()/deviceFleet()
// engine declared above (qms.inventory.units store, shared with the
// Devices/Calibration/Assignments/Movements tabs) — Overview adds only its
// own KPI-strip/AI-banner/fleet-by-type/status-mix computations on top.
// ============================================================================

// renderKpis() — exact port of inventory.js:321-362 (the 8-tile computation
// only; rendering/DOM is the React component's job). Order and formulas are
// exact: Device types → Deployed → Available → Overdue calib. → Calib. soon
// → Fleet value → Consumables low → Stock value.
export function buildInventoryKpis(units: InventoryUnit[]): InventoryKpiCard[] {
  const cat = getDeviceCatalog()
  const cons = getConsumables()

  const totalUnits = units.length
  const deployed = units.filter((u) => u.assignedTo).length
  const available = units.filter((u) => !u.assignedTo && u.status === 'ACTIVE').length
  const overdueCalib = units.filter((u) => calibStatus(u).code === 'OVER').length
  const soonCalib = units.filter((u) => calibStatus(u).code === 'SOON').length
  const fleetValue = cat.reduce((a, d) => a + ((d.unitsAvailable || 0) + (d.unitsDeployed || 0)) * (d.pricePerUnit || 0), 0)

  const consLow = cons.filter((c) => {
    const code = consumableStatus(c).code
    return code === 'LOW' || code === 'CRIT'
  }).length
  const consValue = cons.reduce((a, c) => a + c.stock * c.pricePerUnit, 0)

  return [
    { label: 'Device types', tone: 'brand', icon: 'cpu', value: cat.length, sub: `${totalUnits} units · view fleet`, tab: 'devices' },
    { label: 'Deployed', tone: 'teal', icon: 'route', value: deployed, sub: 'With FOs · see assignments', tab: 'assignments' },
    { label: 'Available', tone: 'emerald', icon: 'check-circle-2', value: available, sub: 'Ready to ship · view fleet', tab: 'devices' },
    { label: 'Overdue calib.', tone: 'rose', icon: 'alert-triangle', value: overdueCalib, sub: overdueCalib ? 'Service now · open calibration' : 'All current', tab: 'calibration' },
    { label: 'Calib. soon', tone: 'amber', icon: 'clock', value: soonCalib, sub: 'Due ≤14d · open calibration', tab: 'calibration' },
    { label: 'Fleet value', tone: 'violet', icon: 'wallet', value: inrShort(fleetValue), sub: 'Replacement · view fleet', tab: 'devices' },
    { label: 'Consumables low', tone: 'amber', icon: 'package', value: consLow, sub: consLow ? 'Reorder · open consumables' : `${cons.length} SKUs OK`, tab: 'consumables' },
    { label: 'Stock value', tone: 'brand', icon: 'box', value: inrShort(consValue), sub: 'On hand · open consumables', tab: 'consumables' },
  ]
}

// renderAi() — exact port of inventory.js:364-379. Joins (with ' · ') any
// applicable clause; low-SKU clause only appears when crit===0 (matches the
// prototype's `if (low && !crit)` guard exactly); falls back to the "healthy"
// message when no clause applies.
export function buildInventoryAiSummary(units: InventoryUnit[]): string {
  const cons = getConsumables()
  const overdue = units.filter((u) => calibStatus(u).code === 'OVER').length
  const soon = units.filter((u) => calibStatus(u).code === 'SOON').length
  const crit = cons.filter((c) => consumableStatus(c).code === 'CRIT').length
  const low = cons.filter((c) => consumableStatus(c).code === 'LOW').length

  const parts: string[] = []
  if (overdue) parts.push(`<b>${overdue}</b> unit${overdue > 1 ? 's' : ''} overdue calibration — pull from rotation`)
  if (soon) parts.push(`<b>${soon}</b> due within 14d`)
  if (crit) parts.push(`<b>${crit}</b> consumable SKU${crit > 1 ? 's' : ''} critical (PO required)`)
  if (low && !crit) parts.push(`<b>${low}</b> SKU${low > 1 ? 's' : ''} at reorder level`)
  return parts.length ? parts.join(' · ') : 'Fleet healthy. No action needed.'
}

// tabOverview()'s fleetByType — exact port of inventory.js:421-429. `label`
// (device type's first word) is computed but never actually rendered by the
// prototype — the render loop prints `full` for both the title attribute and
// the visible text — kept here only for parity/reference.
const FLEET_COLOR_PALETTE = ['#3b6dff', '#14b8a6', '#8b5cf6', '#f59e0b', '#ec4899', '#0ea5e9', '#10b981', '#f43f5e']

export function fleetByDeviceType(): FleetByTypeRow[] {
  return getDeviceCatalog().map((d, i) => ({
    label: d.type.split(' ')[0],
    full: d.type,
    value: (d.unitsAvailable || 0) + (d.unitsDeployed || 0),
    color: FLEET_COLOR_PALETTE[i % FLEET_COLOR_PALETTE.length],
  }))
}

// tabOverview()'s statusMix — exact port of inventory.js:432-433. Tallies
// consumableStatus().code counts across every consumable.
export function consumablesStatusMix(): ConsumableStatusMix {
  const mix: ConsumableStatusMix = { HEALTH: 0, LOW: 0, CRIT: 0 }
  getConsumables().forEach((c) => {
    mix[consumableStatus(c).code]++
  })
  return mix
}

// tabOverview()'s overdueUnits — exact port of inventory.js:436-437. NOT
// sorted by severity (unlike the Calibration tab, which does sort) — units
// array order, sliced to the first 5.
export function overdueUnitsForOverview(units: InventoryUnit[]): InventoryUnit[] {
  return units.filter((u) => calibStatus(u).code === 'OVER').slice(0, 5)
}

// tabOverview()'s critCons — exact port of inventory.js:438. Sliced to first
// 5 for display in the Consumables stock health card's "Needs PO now" list.
export function criticalConsumables(): Consumable[] {
  return getConsumables().filter((c) => consumableStatus(c).code === 'CRIT')
}

// ============================================================================
// Dashboards tab (window.QMS_InvIntel.tabDashboards()/dashBody(), inventory-
// intel.js lines 105-315) — exact port of the synthesis-layer computations:
// valuation()/logisticsRollup()/forecast()/campReadiness()/priceAlerts()/
// calibDue(), each pure and recomputed live from the shared stores above.
// ============================================================================

// assetItems() — exact port (inventory-intel.js:28).
export function assetItems(): InventoryItem[] {
  return getItems().filter((it) => isAssetType(it.itemType))
}
// valuation() — exact port (inventory-intel.js:105-121). foHoldings is
// optional-injected (the FO Inventory/Item Master engine isn't built in this
// pass) — degrades to fieldValue=0 exactly like the prototype's own
// `if (masters() && masters().foHoldings)` guard.
export function valuation(units: InventoryUnit[], people: Person[], foHoldings?: (personId: string) => FoHoldings | undefined): InventoryValuation {
  const inventoryValue = consumableItems().reduce((a, it) => a + (it.qtyOnHand || 0) * (it.purchaseCost || 0), 0)

  let fieldValue = 0
  if (foHoldings) {
    allFos(people).forEach((f) => {
      fieldValue += foHoldings(f.id)?.totalValue || 0
    })
  }

  let assetValue = 0
  let assetPurchase = 0
  assetItems().forEach((it) => {
    const n = it.itemType === 'Device'
      ? units.filter((u) => u.deviceId === it.sourceId && u.status !== 'RETIRED').length || it.qtyOnHand || 1
      : it.qtyOnHand || 1
    assetValue += (it.currentValue || it.purchaseCost || 0) * n
    assetPurchase += (it.purchaseCost || 0) * n
  })

  const expiredValue = consumableItems().reduce((a, it) => {
    const b = expiryBand(it.expiryDate)
    return a + (b && b.code === 'EXPIRED' ? (it.qtyOnHand || 0) * (it.purchaseCost || 0) : 0)
  }, 0)

  const damagedValue = getFieldReports(units, people)
    .filter((r) => r.type === 'DAMAGE' || r.type === 'LOSS')
    .reduce((a, r) => {
      const it = itemById(r.itemId)
      return a + (r.qty || 0) * (it?.purchaseCost || 0)
    }, 0)

  const amcCost = assetItems().reduce((a, it) => a + (it.amcApplicable ? it.amcCost || 0 : 0), 0)
  const depreciated = assetPurchase - assetValue

  return { inventoryValue, fieldValue, assetValue, assetPurchase, expiredValue, damagedValue, amcCost, depreciated }
}

// logisticsRollup() — exact port (inventory-intel.js:123-129). NOTE this is
// the Dashboards tab's OWN rollup (all transfers, floor-guarded at 1) —
// distinct from transfersLogisticsRollup() above (Transfers tab's identical
// math, kept as a separate exported function since the two tabs were built
// in separate passes and both need their own call signature).
export function logisticsRollup(): LogisticsRollup {
  const list = getTransfers()
  const total = list.reduce((a, t) => a + (t.logistics || 0), 0)
  const campN = Math.max(1, dashCamps().length)
  const patN = Math.max(1, dashCamps().reduce((a, c) => a + (c.patientsDone || c.patientsExpected || 0), 0))
  return {
    total,
    perTransfer: total / Math.max(1, list.length),
    perCamp: total / campN,
    perPatient: total / patN,
    inTransit: list.filter((t) => t.status === 'IN_TRANSIT').length,
  }
}

// priceAlerts() — exact port (inventory-intel.js:308-314). Groups by
// itemId|vendor, needs ≥2 points (sorted ascending by date) to compute a
// first→last % change, flags if >8%.
export function priceAlerts(): PriceAlert[] {
  const byItemVen = new Map<string, PriceHistoryRow[]>()
  getPriceHistory().forEach((r) => {
    const k = r.itemId + '|' + r.vendor
    const list = byItemVen.get(k) ?? []
    list.push(r)
    byItemVen.set(k, list)
  })
  const alerts: PriceAlert[] = []
  byItemVen.forEach((series) => {
    const s = [...series].sort((a, b) => a.date.localeCompare(b.date))
    if (s.length >= 2) {
      const chg = ((s[s.length - 1].unitCost - s[0].unitCost) / Math.max(1, s[0].unitCost)) * 100
      if (chg > 8) alerts.push({ name: s[0].itemName, vendor: s[0].vendor, chg: Math.round(chg) })
    }
  })
  return alerts
}

// calibDue() — exact port (inventory-intel.js:315). Simple <14-day filter —
// includes both overdue (negative days) AND due-soon (0-13d), a BROADER set
// than the Calibration/Overview tabs' own OVER/SOON split (see calibStatus()
// above) — deliberately not unified with that vocabulary, per the research
// spec's note that this is used only for the Operations dashboard tile.
export function calibDue(units: InventoryUnit[]): InventoryUnit[] {
  return units.filter((u) => {
    const d = daysFromNow(u.nextCalibration)
    return d != null && d < 14
  })
}

// ranked vendor scorecard — exact port of the Vendor sub-view's inline
// `ranked` computation (inventory-intel.js:236). sc = round(mean(delivery,
// quality, cost)); sorted descending by sc.
export function rankedVendors(): RankedVendor[] {
  return getVendors()
    .map((v) => ({ v, sc: Math.round((v.deliveryScore + v.qualityScore + v.costScore) / 3) }))
    .sort((a, b) => b.sc - a.sc)
}

// dashBody()'s per-sub-view kpiGrid() cards — exact port of inventory-
// intel.js:187-268 (all 8 branches). Bundled into one function (rather than
// 8 exported ones) since every branch shares the same v/lg/f30/ready
// precomputation the prototype's dashBody() itself hoists once at the top.
export interface DashboardsData {
  valuation: InventoryValuation
  logistics: LogisticsRollup
  forecast60: ForecastRow[]
  forecast30: ForecastRow[]
  ready: { c: ReturnType<typeof dashCamps>[number]; r: CampReadinessScore }[]
  ranked: RankedVendor[]
  pos: PurchaseOrder[]
  prs: PurchaseRequisition[]
  grns: GoodsReceiptNote[]
  refills: RefillRequest[]
  fieldReports: FieldReport[]
  units: InventoryUnit[]
  priceAlerts: PriceAlert[]
  calibDue: InventoryUnit[]
  /** transferTable()'s own row source (inventory-intel.js:293-296) — the
   * SAME shared qms.inventory.transfers store logisticsRollup() sums above,
   * exposed separately here since the Logistics sub-view's table needs the
   * raw rows, not just the rollup totals. */
  logisticsTransfers: Transfer[]
}

export function buildDashboardsData(
  units: InventoryUnit[],
  people: Person[],
  foHoldings?: (personId: string) => FoHoldings | undefined,
): DashboardsData {
  return {
    valuation: valuation(units, people, foHoldings),
    logistics: logisticsRollup(),
    forecast60: forecast(60),
    forecast30: forecast(30),
    ready: upcomingCamps().map((c) => ({ c, r: campReadiness(c) })),
    ranked: rankedVendors(),
    pos: getPos(),
    prs: getPrs(),
    grns: getGrns(),
    refills: getRefills(units, people),
    fieldReports: getFieldReports(units, people),
    units,
    priceAlerts: priceAlerts(),
    calibDue: calibDue(units),
    logisticsTransfers: getTransfers(),
  }
}

function kpiTone(v: number, hi: number, mid: number): 'emerald' | 'amber' | 'rose' {
  return v >= hi ? 'emerald' : v >= mid ? 'amber' : 'rose'
}

// buildDashboardKpis(sub, data) — exact port of dashBody()'s 8 kpiGrid()
// branches (inventory-intel.js:187-268). Order/labels/icons/tones/subs/tab
// targets are copied verbatim per sub-view.
export function buildDashboardKpis(sub: DashboardSubView, data: DashboardsData): DashboardKpiCard[] {
  const { valuation: v, logistics: lg, forecast30: f30, ready, ranked, pos, prs, grns, refills, fieldReports, calibDue: calib } = data

  if (sub === 'exec') {
    const avgReady = ready.length ? Math.round(ready.reduce((a, x) => a + x.r.score, 0) / ready.length) : 0
    return [
      { label: 'Inventory value', icon: 'package', tone: 'brand', value: inrShort(v.inventoryValue), sub: 'central bulk', tab: 'warehouse' },
      { label: 'Asset value', icon: 'cpu', tone: 'violet', value: inrShort(v.assetValue), sub: 'devices + IT/office', tab: 'devices' },
      { label: 'Field valuation', icon: 'route', tone: 'teal', value: inrShort(v.fieldValue), sub: 'with FOs', tab: 'foinventory' },
      { label: 'Open POs', icon: 'shopping-cart', tone: 'amber', value: pos.filter((p) => p.status !== 'CLOSED' && p.status !== 'CANCELLED').length, sub: 'committed spend', tab: 'procurement' },
      { label: 'Expiring < 90d', icon: 'calendar-clock', tone: 'rose', value: consumableItems().filter((it) => { const b = expiryBand(it.expiryDate); return b !== null && (b.css === 'red' || b.css === 'orange') }).length, sub: 'act now', tab: 'expiry' },
      { label: 'Upcoming camps', icon: 'tent', tone: 'brand', value: upcomingCamps().length, sub: 'next horizon', tab: 'fieldops' },
      { label: 'Avg readiness', icon: 'list-checks', tone: kpiTone(avgReady, 90, 70), value: avgReady + '%', sub: 'across upcoming' },
      { label: '30d shortages', icon: 'alert-triangle', tone: 'rose', value: f30.filter((r) => r.shortage > 0).length, sub: 'SKUs short', tab: 'procurement' },
    ]
  }

  if (sub === 'inventory') {
    const low = consumableItems().filter((it) => (it.qtyOnHand || 0) <= (it.reorderLevel || 0)).length
    const bands = { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0, EXPIRED: 0 }
    consumableItems().forEach((it) => {
      const b = expiryBand(it.expiryDate)
      if (b) bands[b.code]++
    })
    return [
      { label: 'SKUs', icon: 'package', tone: 'brand', value: consumableItems().length, sub: 'consumables', tab: 'masters' },
      { label: 'Below reorder', icon: 'alert-triangle', tone: 'rose', value: low, sub: 'need refill', tab: 'warehouse' },
      { label: 'Central value', icon: 'warehouse', tone: 'teal', value: inrShort(v.inventoryValue), sub: 'bulk at HO', tab: 'warehouse' },
      { label: 'Expiring/expired', icon: 'calendar-clock', tone: 'amber', value: bands.RED + bands.ORANGE + bands.EXPIRED, sub: `${bands.EXPIRED} expired`, tab: 'expiry' },
    ]
  }

  if (sub === 'procurement') {
    const awaiting = pos.filter((p) => p.status === 'AWAITING').length
    const open = pos.filter((p) => p.status !== 'CLOSED' && p.status !== 'CANCELLED')
    const committed = open.reduce((a, p) => a + poTotal(p), 0)
    return [
      { label: 'PRs pending', icon: 'file-text', tone: 'amber', value: prs.filter((p) => p.status === 'PENDING').length, sub: 'in approval', tab: 'procurement' },
      { label: 'PO · OM approval', icon: 'user-check', tone: 'rose', value: awaiting, sub: 'awaiting sign-off', tab: 'procurement' },
      { label: 'Open POs', icon: 'shopping-cart', tone: 'brand', value: open.length, sub: inrShort(committed) + ' committed', tab: 'procurement' },
      { label: 'GRNs', icon: 'package-check', tone: 'emerald', value: grns.length, sub: 'received', tab: 'procurement' },
    ]
  }

  if (sub === 'finance') {
    return [
      { label: 'Inventory value', icon: 'package', tone: 'brand', value: inrShort(v.inventoryValue), sub: 'consumables' },
      { label: 'Asset value', icon: 'cpu', tone: 'violet', value: inrShort(v.assetValue), sub: 'net book value' },
      { label: 'Depreciated', icon: 'trending-down', tone: 'amber', value: inrShort(v.depreciated), sub: 'from ' + inrShort(v.assetPurchase) },
      { label: 'AMC / year', icon: 'shield-check', tone: 'teal', value: inrShort(v.amcCost), sub: 'contracts' },
      { label: 'Expired value', icon: 'calendar-x', tone: 'rose', value: inrShort(v.expiredValue), sub: 'write-off risk' },
      { label: 'Damage/loss', icon: 'triangle-alert', tone: 'rose', value: inrShort(v.damagedValue), sub: 'reported' },
      { label: 'Logistics spend', icon: 'truck', tone: 'amber', value: inrShort(lg.total), sub: 'transfers' },
      { label: 'Field valuation', icon: 'route', tone: 'teal', value: inrShort(v.fieldValue), sub: 'in field' },
    ]
  }

  if (sub === 'vendor') {
    const top = ranked[0]
    const avgSc = ranked.length ? Math.round(ranked.reduce((a, r) => a + r.sc, 0) / ranked.length) : 0
    return [
      { label: 'Vendors', icon: 'contact', tone: 'brand', value: getVendors().length, sub: 'active', tab: 'vendors' },
      { label: 'Avg scorecard', icon: 'star', tone: 'emerald', value: avgSc, sub: 'all vendors' },
      { label: 'Top vendor', icon: 'award', tone: 'teal', value: top ? top.v.name : '—', sub: top ? 'score ' + top.sc : '', tab: 'vendors' },
      { label: 'Price alerts', icon: 'trending-up', tone: 'amber', value: priceAlerts().length, sub: '> 8% increase', tab: 'vendors' },
    ]
  }

  if (sub === 'logistics') {
    return [
      { label: 'Logistics spend', icon: 'wallet', tone: 'amber', value: inrShort(lg.total), sub: getTransfers().length + ' transfers', tab: 'transfers' },
      { label: 'Cost / transfer', icon: 'package', tone: 'brand', value: inr(lg.perTransfer), sub: 'all-in' },
      { label: 'Cost / camp', icon: 'tent', tone: 'teal', value: inr(lg.perCamp), sub: dashCamps().length + ' camps' },
      { label: 'Cost / patient', icon: 'user', tone: 'violet', value: inr(lg.perPatient), sub: 'delivered' },
    ]
  }

  if (sub === 'readiness') {
    const g = ready.filter((x) => x.r.band === 'green').length
    const a = ready.filter((x) => x.r.band === 'amber').length
    const r = ready.filter((x) => x.r.band === 'red').length
    return [
      { label: 'Upcoming camps', icon: 'tent', tone: 'brand', value: ready.length, sub: 'scored' },
      { label: 'Ready (>90%)', icon: 'check-circle-2', tone: 'emerald', value: g, sub: 'green' },
      { label: 'At watch (70–90%)', icon: 'clock', tone: 'amber', value: a, sub: 'amber' },
      { label: 'At risk (<70%)', icon: 'alert-triangle', tone: 'rose', value: r, sub: 'red' },
    ]
  }

  // operations
  return [
    { label: 'Refills pending', icon: 'refresh-cw', tone: 'amber', value: refills.filter((r) => r.status === 'REQUESTED').length, sub: 'awaiting approval', tab: 'fieldops' },
    { label: 'In-transit', icon: 'truck', tone: 'brand', value: lg.inTransit, sub: 'shipments', tab: 'transfers' },
    { label: 'Calibration due', icon: 'wrench', tone: 'rose', value: calib.length, sub: 'overdue + soon', tab: 'calibration' },
    { label: 'Field reports', icon: 'triangle-alert', tone: 'amber', value: fieldReports.filter((r) => r.type === 'WASTAGE' || r.type === 'DAMAGE' || r.type === 'LOSS').length, sub: 'wastage/damage/loss', tab: 'fieldops' },
  ]
}
