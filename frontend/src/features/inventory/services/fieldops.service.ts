// Field Ops domain service — the holder allocation ledger (FOs + dietitians),
// refill requests, field reports/local procurement, and FO Inventory (per-FO
// device + consumable holdings derived from that same allocation ledger).
// Split out of movement.service.ts as its own domain (Phase 3 service
// breakup, 9th service — "if another domain naturally exists, create another
// service") since Field Ops + FO Inventory are tightly coupled around one
// ledger and don't belong to Movements/Transfers. Every function below is
// moved verbatim, no behavior change.

import type { Person } from '@/types/people.types'
import type {
  InventoryUnit, Holder, AllocationRow, HolderHoldings, RefillRequest, FieldReport, IssueType,
  InventoryItem, FoDeviceHolding, FoConsumableHolding, FoHoldings,
} from '@/features/inventory/inventory.types'
import { CENTRAL, isConsumableType } from '@/features/inventory/inventory.types'
import { isoDate } from './shared/date'
import { hashStr } from './shared/calculations'
import {
  consumableItems, allFos, getDietitians, itemById, getItems, saveAllItems, expiryBand,
  getDeviceCatalog, loadAllocationsStore,
} from './inventory.service'

// ============================================================================
// Field Ops (window.QMS_InvField, inventory-field.js) — the allocation ledger
// (qms.inventory.allocations) is the single source of truth for field stock:
// a holder ('FO:<personId>' | 'DIET:<dietId>') carries qty per item, adjusted
// by adjustAllocation() from refills (dispatch), reports (write-off/return)
// and local procurement. Refills/reports are their own separate ledgers
// (qms.inventory.refills / qms.inventory.fieldreports) — exact port of
// inventory-field.js's seedAllocations()/seedRefills()/seedReports()/
// adjustAllocation()/holderHoldings(). Dashboards' Operations KPI tiles read
// getRefills()/getFieldReports() from this SAME store, so both stay in sync.
// ============================================================================

// holders() — exact port (inventory-field.js:51-56): active FOs + the
// dietitian roster, in that order.
export function holders(people: Person[]): Holder[] {
  return [
    ...allFos(people).map((f) => ({ code: 'FO:' + f.id, name: f.name, kind: 'FO' as const, hq: f.hq || '' })),
    ...getDietitians().map((d) => ({ code: 'DIET:' + d.id, name: d.name, kind: 'Dietitian' as const, hq: d.hq || '' })),
  ]
}

// holderName()/holderKind() — exact port (inventory-field.js:57-64).
export function holderName(code: string, people: Person[]): string {
  if (!code) return '—'
  if (code === CENTRAL) return 'Central WH'
  if (code.startsWith('FO:')) {
    const f = people.find((p) => p.id === code.slice(3))
    return f ? f.name : code.slice(3)
  }
  if (code.startsWith('DIET:')) {
    const d = getDietitians().find((x) => x.id === code.slice(5))
    return d ? d.name : code.slice(5)
  }
  return code
}
export function holderKind(code: string): string {
  if (code && code.startsWith('DIET:')) return 'Dietitian'
  if (code && code.startsWith('FO:')) return 'FO'
  return '—'
}

// ── Allocations ledger (qms.inventory.allocations) — exact port
// (inventory-field.js:66-94). Reuses ALLOCATIONS_STORAGE_KEY/
// loadAllocationsStore() (services/inventory.service.ts — Warehouse tab's
// dietHoldings() reads the same store read-only; Field Ops is the only
// writer).
const ALLOCATIONS_STORAGE_KEY = 'qms.inventory.allocations'
interface AllocationsStore { _v: number; rows: AllocationRow[] }

function persistAllocationsStore(rows: AllocationRow[]): void {
  try {
    localStorage.setItem(ALLOCATIONS_STORAGE_KEY, JSON.stringify({ _v: 1, rows }))
  } catch {
    // localStorage unavailable — mock feature degrades to in-memory only.
  }
}
function loadAllocationsStoreVersioned(): AllocationsStore | null {
  try {
    const raw = localStorage.getItem(ALLOCATIONS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AllocationsStore) : null
  } catch {
    return null
  }
}
function getAllocations(): AllocationRow[] {
  return loadAllocationsStore()
}
function holderAllocations(holder: string): AllocationRow[] {
  return getAllocations().filter((a) => a.holder === holder && (a.qty || 0) > 0)
}

// adjustAllocation() — exact port (inventory-field.js:72-87). No-op if holder
// falsy or CENTRAL; only creates a new row on positive delta; qty floors at
// 0; the just-touched row is always kept (even at qty 0) so it can be found
// again next time — every OTHER row that dropped to qty<=0 is dropped.
export function adjustAllocation(holder: string, itemId: string, delta: number, batch?: string, expiry?: string): void {
  if (!holder || holder === CENTRAL) return
  const rows = getAllocations()
  let a = rows.find((x) => x.holder === holder && x.itemId === itemId)
  if (!a) {
    if (delta <= 0) return
    const it = itemById(itemId)
    a = { holder, itemId, qty: 0, batchNo: batch || it?.batchNo || '', expiryDate: expiry || it?.expiryDate || '', updatedOn: isoDate(new Date()) }
    rows.push(a)
  }
  a.qty = Math.max(0, (a.qty || 0) + delta)
  if (batch) a.batchNo = batch
  if (expiry) a.expiryDate = expiry
  a.updatedOn = isoDate(new Date())
  const touched = a
  persistAllocationsStore(rows.filter((x) => (x.qty || 0) > 0 || x === touched))
}

// holderHoldings() — exact port (inventory-field.js:90-94).
export function holderHoldings(holder: string): HolderHoldings {
  const mine = holderAllocations(holder)
  const cons = mine.map((a) => {
    const it = itemById(a.itemId)
    const item: InventoryItem = it ?? ({ id: a.itemId, itemType: 'Consumable', name: a.itemId, status: 'ACTIVE' } as InventoryItem)
    return { item, qty: a.qty, value: a.qty * (item.purchaseCost || 0), band: expiryBand(a.expiryDate || item.expiryDate) }
  })
  return { consumables: cons, value: cons.reduce((s, c) => s + c.value, 0) }
}

// seedAllocations() — exact port (inventory-field.js:105-123). FOs derive
// their starting kit by calling foConsumableHoldings(fo.id) for every active
// FO (that engine's own derived-kit fallback branch produces the exact
// qty/batch/expiry a fresh FO's kit would have, since this seed runs before
// any allocation rows exist for that FO — matching the prototype's
// `M.foHoldings(f.id).consumables` call exactly), then dietitians get the
// deterministic hashStr(dietId)-seeded General Consumable + Marketing
// Material kit (the SAME formula as dietHoldings()'s own fallback branch, so
// the two engines agree once this ledger exists).
function seedAllocations(units: InventoryUnit[], people: Person[]): AllocationRow[] {
  const cur = loadAllocationsStoreVersioned()
  if (cur && cur._v === 1) return cur.rows

  const rows: AllocationRow[] = []
  allFos(people).forEach((f) => {
    const cons = foConsumableHoldings(f.id, units, people)
    cons.forEach((c) => {
      rows.push({ holder: 'FO:' + f.id, itemId: c.item.id, qty: c.qty, batchNo: c.item.batchNo || '', expiryDate: c.item.expiryDate || '', updatedOn: isoDate(new Date()) })
    })
  })
  const kit = getItems().filter((it) => it.itemType === 'General Consumable' || it.itemType === 'Marketing Material')
  getDietitians().forEach((d) => {
    const h = hashStr(d.id)
    kit.forEach((it, i) => {
      const qty = 2 + ((h + i * 5) % 7)
      rows.push({ holder: 'DIET:' + d.id, itemId: it.id, qty, batchNo: it.batchNo || '', expiryDate: it.expiryDate || '', updatedOn: isoDate(new Date()) })
    })
  })
  persistAllocationsStore(rows)
  return rows
}

const REFILLS_STORAGE_KEY = 'qms.inventory.refills'
const REPORTS_STORAGE_KEY = 'qms.inventory.fieldreports'

interface RefillsStore { _v: number; rows: RefillRequest[] }
interface ReportsStore { _v: number; rows: FieldReport[] }

function loadRefillsStore(): RefillsStore | null {
  try {
    const raw = localStorage.getItem(REFILLS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as RefillsStore) : null
  } catch {
    return null
  }
}
function persistRefillsStore(rows: RefillRequest[]): void {
  try {
    localStorage.setItem(REFILLS_STORAGE_KEY, JSON.stringify({ _v: 1, rows }))
  } catch {
    // localStorage unavailable — mock feature degrades to in-memory only.
  }
}
// Exported — forecasting.service.ts's applyConsumption() unshifts a synthetic
// CONSUMPTION report row onto this SAME ledger, exact port of the prototype
// sharing one reports() store across the Field Ops and Forecast tabs.
export function loadReportsStore(): ReportsStore | null {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ReportsStore) : null
  } catch {
    return null
  }
}
export function persistReportsStore(rows: FieldReport[]): void {
  try {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify({ _v: 1, rows }))
  } catch {
    // localStorage unavailable — mock feature degrades to in-memory only.
  }
}

// mkRefill()/mkReport() — exact port (inventory-field.js:138-140, 158-160).
function mkRefill(holder: string, itemId: string, qty: number, reason: string | undefined, status: RefillRequest['status'], seq?: number): RefillRequest {
  const it = itemById(itemId)
  return {
    id: 'RF-' + (seq ?? (5000 + Math.floor(hashStr(holder + itemId) % 900))),
    date: isoDate(new Date()),
    holder, itemId,
    itemName: it?.name || itemId,
    uom: it?.uom || 'unit',
    qty, reason, status,
  }
}
function mkReport(holder: string, itemId: string, qty: number, type: IssueType, reason: string | undefined, seq?: number): FieldReport {
  const it = itemById(itemId)
  return {
    id: 'FR-' + (seq ?? (6000 + Math.floor(hashStr(holder + type) % 900))),
    date: isoDate(new Date()),
    holder, itemId,
    itemName: it?.name || itemId,
    uom: it?.uom || 'unit',
    qty, type, reason,
    status: 'REPORTED',
  }
}

// seedRefills()/seedReports() — exact port (inventory-field.js:125-137,
// 145-157). Exactly 3 demo rows each, across the first 1-3 holders/items.
function seedRefills(people: Person[]): RefillRequest[] {
  const cur = loadRefillsStore()
  if (cur && cur._v === 1) return cur.rows
  const hs = holders(people)
  const cons = consumableItems()
  const rows: RefillRequest[] = []
  if (hs.length && cons.length) {
    rows.push(mkRefill(hs[0].code, cons[0].id, 20, 'Running low after camp', 'REQUESTED', 5101))
    rows.push(mkRefill((hs[1] || hs[0]).code, cons[1 % cons.length].id, 15, 'Upcoming camp top-up', 'APPROVED', 5102))
    if (hs.length > 2) rows.push(mkRefill(hs[2].code, cons[2 % cons.length].id, 30, 'Stockout risk', 'DISPATCHED', 5103))
  }
  persistRefillsStore(rows)
  return rows
}
function seedReports(people: Person[]): FieldReport[] {
  const cur = loadReportsStore()
  if (cur && cur._v === 1) return cur.rows
  const hs = holders(people)
  const cons = consumableItems()
  const rows: FieldReport[] = []
  if (hs.length && cons.length) {
    rows.push(mkReport(hs[0].code, cons[0].id, 3, 'WASTAGE', 'Spillage during camp', 6101))
    rows.push(mkReport((hs[1] || hs[0]).code, cons[1 % cons.length].id, 1, 'DAMAGE', 'Crushed in transit', 6102))
    rows.push(mkReport(hs[0].code, cons[2 % cons.length].id, 25, 'CONSUMPTION', 'Camp CMP-1042 · 25 patients', 6103))
  }
  persistReportsStore(rows)
  return rows
}

// seed() — exact port of inventory-field.js:97-102 (window.QMS_InvField.seed()).
// Called once per Field Ops query — idempotent via each store's own `_v`
// guard. Needs the fleet-unit ledger (units) so seedAllocations() can call
// foConsumableHoldings() for the FO starting-kit derivation.
export function seedFieldOps(units: InventoryUnit[], people: Person[]): void {
  seedAllocations(units, people)
  seedRefills(people)
  seedReports(people)
}

export function getRefills(units: InventoryUnit[], people: Person[]): RefillRequest[] {
  seedFieldOps(units, people)
  return loadRefillsStore()?.rows ?? []
}
export function getFieldReports(units: InventoryUnit[], people: Person[]): FieldReport[] {
  seedFieldOps(units, people)
  return loadReportsStore()?.rows ?? []
}

// approveRefill()/rejectRefill()/dispatchRefill() — exact port
// (inventory-field.js:238-248). dispatchRefill() marks DISPATCHED; the
// prototype's cross-tab handoff into the Warehouse module's own
// openTransfer() modal is out of this tab's scope (WarehouseTab/TransfersTab
// own that modal locally) — the caller's success toast still reads
// "→ transfer drafted to {holder}" to match copy, matching the prototype's
// own fallback `else` toast branch when that cross-module call isn't wired.
export function approveRefill(id: string): RefillRequest {
  const rows = loadRefillsStore()?.rows ?? []
  const r = rows.find((x) => x.id === id)
  if (!r) throw new Error('Refill not found')
  r.status = 'APPROVED'
  persistRefillsStore(rows)
  return r
}
export function rejectRefill(id: string): RefillRequest {
  const rows = loadRefillsStore()?.rows ?? []
  const r = rows.find((x) => x.id === id)
  if (!r) throw new Error('Refill not found')
  r.status = 'REJECTED'
  persistRefillsStore(rows)
  return r
}
export function dispatchRefill(id: string): RefillRequest {
  const rows = loadRefillsStore()?.rows ?? []
  const r = rows.find((x) => x.id === id)
  if (!r) throw new Error('Refill not found')
  r.status = 'DISPATCHED'
  persistRefillsStore(rows)
  return r
}

// saveRefill() — exact port (inventory-field.js:265-272).
export interface NewRefillInput {
  holder: string
  itemId: string
  qty: number
  reason?: string
}
export function saveRefill(input: NewRefillInput): RefillRequest {
  const rows = loadRefillsStore()?.rows ?? []
  const rec = mkRefill(input.holder, input.itemId, input.qty, input.reason, 'REQUESTED', 5200 + rows.length)
  rows.unshift(rec)
  persistRefillsStore(rows)
  return rec
}

// saveReport() — exact port (inventory-field.js:312-325). ALWAYS reduces the
// holder's allocation regardless of type; RETURN additionally adds the qty
// back onto the item's central qtyOnHand.
export interface NewReportInput {
  holder: string
  itemId: string
  type: IssueType
  qty: number
  reason?: string
}
export function saveReport(input: NewReportInput): FieldReport {
  const rows = loadReportsStore()?.rows ?? []
  const rec = mkReport(input.holder, input.itemId, input.qty, input.type, input.reason, 6200 + rows.length)
  rows.unshift(rec)
  persistReportsStore(rows)

  adjustAllocation(input.holder, input.itemId, -input.qty)
  if (input.type === 'RETURN') {
    const its = getItems()
    const it = its.find((x) => x.id === input.itemId)
    if (it) {
      it.qtyOnHand = (it.qtyOnHand || 0) + input.qty
      saveAllItems(its)
    }
  }
  return rec
}

// saveLocalProcure() — exact port (inventory-field.js:376-387). Raises the
// holder's stock immediately (no approval step) via adjustAllocation(+qty),
// and separately logs a LOCAL_PROCURE report row carrying cost + invoiceNo —
// LOCAL_PROCURE is deliberately excluded from ISSUE_TYPES (only reachable via
// this modal, never the Report Stock Event type <select>).
export interface NewLocalProcureInput {
  holder: string
  itemId: string
  qty: number
  cost: number
  vendor?: string
  invoiceNo?: string
  reason?: string
}
export function saveLocalProcure(input: NewLocalProcureInput): FieldReport {
  adjustAllocation(input.holder, input.itemId, input.qty)
  const rows = loadReportsStore()?.rows ?? []
  const rec = mkReport(
    input.holder,
    input.itemId,
    input.qty,
    'LOCAL_PROCURE' as IssueType,
    (input.vendor || 'Local') + ' · ' + (input.reason || ''),
    6300 + rows.length,
  )
  rec.cost = input.cost || 0
  rec.invoiceNo = input.invoiceNo || ''
  rows.unshift(rec)
  persistReportsStore(rows)
  return rec
}

// ============================================================================
// FO Inventory tab (window.QMS_InvMasters.tabFoInventory()/foHoldings()/
// foDeviceHoldings()/foConsumableHoldings()/openFoInventory(), inventory-
// masters.js lines 569-722) — the per-FO holdings + valuation engine, shared
// verbatim with the FO Profile page's own embedded foInventoryHtml() block
// elsewhere in the app (not built in this pass). Placed alongside Field Ops
// (above) since foConsumableHoldings() reads the SAME qms.inventory.allocations
// ledger Field Ops owns writing.
// ============================================================================

// itemForDevice()/deviceCost() — exact port (inventory-masters.js:573-579).
// Prefers the unified item-master record for a catalog device (currentValue
// falling back to purchaseCost for "current", purchaseCost alone for
// "replace"); falls back to the raw DEVICE_CATALOG pricePerUnit heuristic
// (current = round(price*0.6), replace = price) if no item-master row
// matches (data-integrity guard, not expected to hit in normal seeded data).
function itemForDevice(devId: string): InventoryItem | undefined {
  return getItems().find((it) => it.itemType === 'Device' && it.sourceId === devId)
}

function deviceCost(devId: string): { current: number; replace: number } {
  const it = itemForDevice(devId)
  if (it) return { current: it.currentValue || it.purchaseCost || 0, replace: it.purchaseCost || 0 }
  const d = getDeviceCatalog().find((x) => x.id === devId)
  return { current: Math.round((d?.pricePerUnit || 0) * 0.6), replace: d?.pricePerUnit || 0 }
}

// foDeviceHoldings() — exact port (inventory-masters.js:584-594). Prefers the
// per-serial fleet ledger (qms.inventory.units) filtered to units assigned to
// this FO and not retired; falls back to the person record's machinesAssigned[]
// device-type list (calibDue is blank in this fallback path — there's no
// per-serial calibration date to read).
export function foDeviceHoldings(foId: string, units: InventoryUnit[], people: Person[]): FoDeviceHolding[] {
  const u = units.filter((x) => x.assignedTo === foId && x.status !== 'RETIRED')
  if (u.length) {
    return u.map((x) => {
      const c = deviceCost(x.deviceId)
      const it = itemForDevice(x.deviceId)
      return {
        sn: x.sn,
        deviceId: x.deviceId,
        name: it?.name || x.deviceType,
        model: it?.model || '',
        type: it?.category || x.deviceType,
        current: c.current,
        replace: c.replace,
        calibDue: x.nextCalibration || '',
      }
    })
  }
  const p = people.find((x) => x.id === foId)
  return (p?.machinesAssigned || []).map((devId) => {
    const c = deviceCost(devId)
    const it = itemForDevice(devId)
    const d = getDeviceCatalog().find((x) => x.id === devId)
    return {
      sn: '—',
      deviceId: devId,
      name: it?.name || d?.name || devId,
      model: it?.model || d?.model || '',
      type: it?.category || d?.type || '',
      current: c.current,
      replace: c.replace,
      calibDue: '',
    }
  })
}

// foDeviceIds() — exact port (inventory-masters.js:596).
export function foDeviceIds(foId: string, units: InventoryUnit[], people: Person[]): string[] {
  return Array.from(new Set(foDeviceHoldings(foId, units, people).map((d) => d.deviceId)))
}

// foConsumableHoldings() — exact port (inventory-masters.js:600-614).
// Authoritative from the qms.inventory.allocations ledger (holder ===
// 'FO:'+foId, qty>0) when present; else DERIVES a deterministic pseudo-random
// kit from consumable-type items (excluding Marketing Material) that are
// either linked to a device this FO holds, or are itemType==='General
// Consumable' — qty = 2 + ((hashStr(foId) + i*7) % 9), NOT true randomness,
// so the same FO always renders the same kit.
export function foConsumableHoldings(foId: string, units: InventoryUnit[], people: Person[]): FoConsumableHolding[] {
  const allocRows = loadAllocationsStore()
  const alloc = allocRows.filter((a) => a.holder === 'FO:' + foId && (a.qty || 0) > 0)
  if (alloc.length) {
    return alloc.map((a) => {
      const it = itemById(a.itemId)
      return {
        item: it ?? ({ id: a.itemId, itemType: 'Consumable', name: a.itemId, status: 'ACTIVE' } as InventoryItem),
        qty: a.qty,
        value: a.qty * (it?.purchaseCost || 0),
        band: expiryBand(a.expiryDate || it?.expiryDate),
      }
    })
  }
  const devIds = new Set(foDeviceIds(foId, units, people))
  const cons = getItems().filter((it) => isConsumableType(it.itemType) && it.itemType !== 'Marketing Material')
  const held = cons.filter((it) => (it.linkedDeviceId && devIds.has(it.linkedDeviceId)) || it.itemType === 'General Consumable')
  const seedH = hashStr(foId)
  return held.map((it, i) => {
    const qty = 2 + ((seedH + i * 7) % 9)
    return { item: it, qty, value: qty * (it.purchaseCost || 0), band: expiryBand(it.expiryDate) }
  })
}

// foHoldings() — exact port (inventory-masters.js:616-625). Single source of
// truth shared by this tab AND the Field Ops → Allocations sub-tab, both
// reading the same qms.inventory.allocations ledger. expSoon counts
// consumables whose band is red OR orange (<90 days remaining or expired) —
// yellow/green do not count.
export function foHoldings(foId: string, units: InventoryUnit[], people: Person[]): FoHoldings {
  const devices = foDeviceHoldings(foId, units, people)
  const consumables = foConsumableHoldings(foId, units, people)
  const deviceCurrent = devices.reduce((a, d) => a + d.current, 0)
  const deviceReplace = devices.reduce((a, d) => a + d.replace, 0)
  const consumableValue = consumables.reduce((a, c) => a + c.value, 0)
  const expSoon = consumables.filter((c) => c.band && (c.band.css === 'red' || c.band.css === 'orange')).length
  return { devices, consumables, deviceCurrent, deviceReplace, consumableValue, totalValue: deviceCurrent + consumableValue, expSoon }
}

// tabFoInventory() row-building — exact port of inventory-masters.js:668-676
// (the data computation only; rendering is the React component's job). Sorted
// descending by total valuation.
export interface FoInventoryTabRow {
  p: Person
  h: FoHoldings
}

export function buildFoInventoryRows(units: InventoryUnit[], people: Person[]): FoInventoryTabRow[] {
  return allFos(people)
    .map((p) => ({ p, h: foHoldings(p.id, units, people) }))
    .sort((a, b) => b.h.totalValue - a.h.totalValue)
}
