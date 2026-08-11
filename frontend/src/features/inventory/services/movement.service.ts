// Movement domain service — movement logs, and transfers (store + Transfers
// tab logistics/dispatch/deliver). Field Ops (holder allocation ledger,
// refills, field reports) and FO Inventory live in ./fieldops.service — split
// out as their own domain since they're a tightly-coupled pair distinct from
// Movements/Transfers. Split out of the original inventory.service.ts
// (Phase 3 service breakup) — every function below is moved verbatim, no
// behavior change.

import type { Person } from '@/types/people.types'
import { CAMPS } from '@/types/camp.types'
import type {
  Movement, InventoryUnit, Transfer, TransferPod, BalancingSuggestion, InventoryMasterItem, FoHoldings,
} from '@/features/inventory/inventory.types'
import { CENTRAL } from '@/features/inventory/inventory.types'
import { addDays, isoDate } from './shared/date'
import { persistUnitsStore } from './shared/unitsStore'
import { consumableItems, allFos, getDietitians, itemById, getItems, saveAllItems } from './inventory.service'

// ============================================================================
// Movements ledger (window.invNewMovement()/tabMovements(), inventory.js
// lines 221-235, 749-876) — Log Movement modal reachable from the Overview
// tab's shared page-head "New transfer" button, plus the standalone
// Movements tab (out of scope for this pass, wired here so both share one
// ledger + one seeding function).
// ============================================================================

const MOVEMENTS_STORAGE_KEY = 'qms.inventory.movements'

// Exported — fleet.service.ts's markCalibrated() prepends a synthetic CALIB
// movement onto this SAME ledger, exact port of the prototype sharing one
// window.QMS_MASTER movements store across both tabs.
export function loadMovementsStore(): Movement[] | null {
  try {
    const raw = localStorage.getItem(MOVEMENTS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? (parsed as Movement[]) : null
  } catch {
    return null
  }
}
export function persistMovementsStore(movements: Movement[]): void {
  try {
    localStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(movements))
  } catch {
    // localStorage unavailable (e.g. private mode) — mock feature degrades to in-memory only.
  }
}

// seedMovementsIfEmpty() — exact port of inventory.js:221-235. Seeds 5 demo
// rows referencing the first 5 seeded units, only if the store is empty.
export function seedMovementsIfEmpty(units: InventoryUnit[]): Movement[] {
  const cur = loadMovementsStore()
  if (cur && cur.length) return cur
  const dayAgo = (n: number) => isoDate(addDays(new Date(), -n))
  const seeded: Movement[] = [
    { id: 'MV-1024', date: dayAgo(2), type: 'HANDOVER', unitId: units[0]?.id ?? '', deviceType: units[0]?.deviceType ?? '', from: 'Mumbai HQ', to: 'Ravi Kumar (FO)', notes: 'Camp prep · Mumbai cluster', by: 'Vikram Pillai' },
    { id: 'MV-1023', date: dayAgo(3), type: 'RETURN', unitId: units[1]?.id ?? '', deviceType: units[1]?.deviceType ?? '', from: 'Anita Desai (FO)', to: 'Delhi Hub', notes: 'Post-camp return', by: 'Anita Desai' },
    { id: 'MV-1022', date: dayAgo(5), type: 'CALIB', unitId: units[2]?.id ?? '', deviceType: units[2]?.deviceType ?? '', from: 'Pune Hub', to: 'Service Center', notes: 'Calibration window reached', by: 'System' },
    { id: 'MV-1021', date: dayAgo(7), type: 'TRANSFER', unitId: units[3]?.id ?? '', deviceType: units[3]?.deviceType ?? '', from: 'Mumbai HQ', to: 'Bangalore Hub', notes: 'Inventory rebalance', by: 'Aman Verma' },
    { id: 'MV-1020', date: dayAgo(12), type: 'PROCURE', unitId: units[4]?.id ?? '', deviceType: units[4]?.deviceType ?? '', from: 'Vendor', to: 'Mumbai HQ', notes: 'New procurement · Q2 budget', by: 'Aman Verma' },
  ].filter((m) => m.unitId)
  persistMovementsStore(seeded)
  return seeded
}

export function getMovements(units: InventoryUnit[]): Movement[] {
  return seedMovementsIfEmpty(units)
}

// window.invNewMovement()'s save handler — exact port of inventory.js:838-875.
// Builds the movement id as 'MV-{1100+existingCount}', prepends it to the
// ledger, and — depending on type — mutates the unit's assignedTo/location/
// status fields: HANDOVER binds to a matched FO by case-insensitive
// substring match of the FO's name against the `to` field; RETURN/TRANSFER
// clear assignedTo and set location=to; RETIRE sets status='RETIRED'. Other
// types (CALIB/PROCURE) log the movement without mutating the unit, exactly
// like the prototype (only HANDOVER/RETURN/TRANSFER/RETIRE have a mutation
// branch in invNewMovement's save handler).
export interface LogMovementInput {
  type: Movement['type']
  date: string
  unitId: string
  from: string
  to: string
  notes: string
}

export function logMovement(input: LogMovementInput, allUnits: InventoryUnit[], fos: Person[]): { movement: Movement; units: InventoryUnit[] } {
  const unit = allUnits.find((u) => u.id === input.unitId)
  if (!unit) throw new Error('Select a unit')

  const movs = loadMovementsStore() || []
  const m: Movement = {
    id: 'MV-' + (1100 + movs.length),
    date: input.date,
    type: input.type,
    unitId: unit.id,
    deviceType: unit.deviceType,
    from: input.from || '—',
    to: input.to || '—',
    notes: input.notes,
    by: 'Inventory module',
  }
  movs.unshift(m)
  persistMovementsStore(movs)

  const nextUnits = allUnits.map((u) => ({ ...u }))
  const target = nextUnits.find((u) => u.id === unit.id)
  if (target) {
    if (m.type === 'HANDOVER') {
      const fo = fos.find((p) => (m.to || '').toLowerCase().includes((p.name || '').toLowerCase()))
      if (fo) {
        target.assignedTo = fo.id
        target.location = null
      }
    } else if (m.type === 'RETURN' || m.type === 'TRANSFER') {
      target.assignedTo = ''
      target.location = m.to
    } else if (m.type === 'RETIRE') {
      target.status = 'RETIRED'
    }
  }
  persistUnitsStore(nextUnits)

  return { movement: m, units: nextUnits }
}

// NOTE: Devices/Calibration/Assignments tabs reuse the seedUnits()/
// calibStatus()/deviceFleet() engine already defined in fleet.service.ts — a
// second copy of this exact engine previously accumulated here from a
// concurrent tab-building pass (duplicate UNITS_STORAGE_KEY/loadUnitsStore/
// seedUnits/calibStatus/deviceFleet declarations, which broke `tsc`).
// Consolidated back to the one definition there; do not re-declare.

const TRANSFERS_STORAGE_KEY = 'qms.inventory.transfers'

interface TransfersStore {
  _v: number
  rows: Transfer[]
}

function loadTransfersStore(): TransfersStore | null {
  try {
    const raw = localStorage.getItem(TRANSFERS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TransfersStore) : null
  } catch {
    return null
  }
}
function persistTransfersStore(rows: Transfer[]): void {
  try {
    localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify({ _v: 1, rows }))
  } catch {
    // localStorage unavailable — mock feature degrades to in-memory only.
  }
}

// seedTransfers() — exact port (inventory-warehouse.js:104-130). Idempotent
// via the `_v:1` guard. Seeds up to 4 demo transfers referencing the first
// consumable items + first FOs/dietitians, only when nothing is seeded yet.
function seedTransfers(): Transfer[] {
  const cur = loadTransfersStore()
  if (cur && cur._v === 1) return cur.rows

  const cons = consumableItems()
  const fos = allFosCache
  const die = getDietitians()

  const mk = (i: number, from: string, to: string, itemId: string, qty: number, status: Transfer['status']): Transfer => {
    const it = itemById(itemId)
    const courier = 120 + (i * 40) % 300
    const freight = 80 + (i * 25) % 200
    const packaging = 40 + (i * 10) % 80
    const handling = 30 + (i * 8) % 60
    const pod: TransferPod | null = status === 'DELIVERED' ? { ref: 'POD-' + (7700 + i), by: 'Courier', at: isoDate(addDays(new Date(), -(i * 3))) } : null
    return {
      id: 'TR-' + (3101 + i),
      date: isoDate(addDays(new Date(), -(i * 3 + 1))),
      from, to,
      itemId, itemName: it?.name || itemId, qty, uom: it?.uom || 'unit',
      courier, freight, packaging, handling, logistics: courier + freight + packaging + handling,
      status, pod, notes: '',
    }
  }

  const rows: Transfer[] = []
  if (cons.length && fos.length) {
    rows.push(mk(0, CENTRAL, 'FO:' + fos[0].id, cons[0].id, 40, 'DELIVERED'))
    rows.push(mk(1, CENTRAL, 'FO:' + (fos[1] || fos[0]).id, cons[1 % cons.length].id, 30, 'IN_TRANSIT'))
    if (die.length) {
      const generalCons = cons.find((c) => c.itemType === 'General Consumable') || cons[0]
      rows.push(mk(2, CENTRAL, 'DIET:' + die[0].id, generalCons.id, 20, 'IN_TRANSIT'))
    }
    rows.push(mk(3, 'FO:' + fos[0].id, CENTRAL, cons[2 % cons.length].id, 12, 'REQUESTED'))
  }
  persistTransfersStore(rows)
  return rows
}

// seedTransfers()'s demo rows need an FO list but the function itself takes
// no people[] parameter in the prototype (it reads a module-level people()
// helper) — primeTransfersSeed() lets the Warehouse tab hand in the live
// Person[] roster once per session before the first getTransfers() call,
// matching allFos() in the prototype without threading people[] through
// every transfers function signature.
let allFosCache: Person[] = []
export function primeTransfersSeed(people: Person[]): void {
  allFosCache = allFos(people)
}

export function getTransfers(): Transfer[] {
  return seedTransfers()
}

// saveTransfer() — exact port of window.QMS_InvWh.saveTransfer()
// (inventory-warehouse.js:317-332), split into a pure input→Transfer builder
// (the React port's modal calls this instead of reading raw DOM input els).
export interface NewTransferInput {
  from: string
  to: string
  itemId: string
  qty: number
  courier: number
  freight: number
  packaging: number
  handling: number
  notes: string
}

export function saveTransfer(input: NewTransferInput): Transfer {
  const it = itemById(input.itemId)
  const rows = getTransfers()
  const t: Transfer = {
    id: 'TR-' + (3200 + rows.length),
    date: isoDate(new Date()),
    from: input.from,
    to: input.to,
    itemId: input.itemId,
    itemName: it?.name || input.itemId,
    qty: input.qty,
    uom: it?.uom || 'unit',
    courier: input.courier,
    freight: input.freight,
    packaging: input.packaging,
    handling: input.handling,
    logistics: input.courier + input.freight + input.packaging + input.handling,
    status: 'REQUESTED',
    pod: null,
    notes: input.notes,
  }
  rows.unshift(t)
  persistTransfersStore(rows)
  return t
}

// ============================================================================
// Transfers tab (window.QMS_InvWh.tabTransfers()/balancingSuggestions()/
// dispatch()/openDeliver()/saveDeliver(), inventory-warehouse.js:218-377) —
// the logistics rollup strip, Emergency stock-balancing panel and the main
// transfers table + dispatch/deliver+POD action flows. Reuses the canonical
// transfers store (seedTransfers()/getTransfers()/saveTransfer() above,
// shared with the Warehouse tab's own "New transfer" entry point).
// ============================================================================

// camps() — exact port of inventory-warehouse.js:39's fallback branch (reads
// `qms.master.camps`/window.QMS_CAMPS.CAMPS in the prototype). This React
// port has a real Camp[] mock roster (features/camps/camps.mock.ts) — reused
// directly here (synchronous import, not the async getCamps() API-shaped
// wrapper) purely as the same kind of "camps roster" source the prototype
// falls back to, scoped to this tab's own cost-per-camp/cost-per-patient
// rollup math only.
function camps(): { patientsExpected: number; patientsDone: number }[] {
  return CAMPS
}

// Logistics rollup strip's 4 tiles — exact port of tabTransfers()'s totLog/
// campN/patN computation (inventory-warehouse.js:222-224). totLog sums EVERY
// transfer's logistics field (not just active/filtered ones); campN/patN are
// both floor-guarded at 1 to avoid div-by-zero. patN prefers patientsDone,
// falling back to patientsExpected per camp when patientsDone is absent/0.
export function transfersLogisticsRollup(transfers: Transfer[]): {
  totLog: number
  costPerTransfer: number
  costPerCamp: number
  costPerPatient: number
  transferCount: number
  campCount: number
  patientCount: number
} {
  const totLog = transfers.reduce((a, t) => a + (t.logistics || 0), 0)
  const transferCount = transfers.length
  const campCount = camps().length
  const campN = Math.max(1, campCount)
  const patientCount = Math.max(1, camps().reduce((a, c) => a + (c.patientsDone || c.patientsExpected || 0), 0))
  return {
    totLog,
    costPerTransfer: Math.round(totLog / Math.max(1, transferCount)),
    costPerCamp: Math.round(totLog / campN),
    costPerPatient: Math.round(totLog / patientCount),
    transferCount,
    campCount,
    patientCount,
  }
}

// balancingSuggestions() — exact port of inventory-warehouse.js:275-288. Low-
// at-central consumables (qtyOnHand <= reorderLevel, same inclusive-below-
// reorder rule as the Warehouse tab) each get a `need` target of TWICE the
// reorder level minus current on-hand (floor-guarded at 0). When a per-FO
// foHoldings() engine is available (Item Master/FO Inventory tab — not yet
// built in this React port), every active FO's holdings are scanned for a
// consumable match with qty>4 ("has spare" eligibility threshold), sorted
// descending by qty, and the top holder becomes `suggestion`. Without that
// engine, every low item gets `suggestion: null` (forcing the Procure path) —
// exact port of the prototype's own `if (!masters() || !masters().foHoldings)`
// degrade branch, since no FO Inventory tab exists yet in this build.
export function balancingSuggestions(
  foHoldings?: (personId: string) => FoHoldings | undefined,
  people: Person[] = [],
): BalancingSuggestion[] {
  const low = consumableItems().filter((c) => (c.qtyOnHand || 0) <= (c.reorderLevel || 0)) as unknown as InventoryMasterItem[]

  if (!foHoldings) {
    return low.map((it) => ({ item: it, need: Math.max(0, (it.reorderLevel || 0) * 2 - (it.qtyOnHand || 0)), suggestion: null }))
  }

  return low.map((it) => {
    const holders: { loc: string; qty: number }[] = []
    allFos(people).forEach((fo) => {
      const h = foHoldings(fo.id)
      const c = (h?.consumables || []).find((x) => x.item.id === it.id)
      if (c && c.qty > 4) holders.push({ loc: 'FO:' + fo.id, qty: c.qty })
    })
    holders.sort((a, b) => b.qty - a.qty)
    return { item: it, need: Math.max(0, (it.reorderLevel || 0) * 2 - (it.qtyOnHand || 0)), suggestion: holders[0] || null }
  })
}

// dispatch() — exact port of inventory-warehouse.js:334-345. Stock leaves the
// SOURCE on dispatch (not on create): CENTRAL source decrements the shared
// item store's qtyOnHand (floored at 0); any other source delegates to
// window.QMS_InvField.adjustAllocation, which doesn't exist in this build —
// silently skipped (no error, no toast), exact port of that degrade path.
export function dispatchTransfer(id: string): Transfer {
  const rows = getTransfers()
  const t = rows.find((x) => x.id === id)
  if (!t) throw new Error('Transfer not found')

  if (t.from === CENTRAL) {
    const its = getItems()
    const it = its.find((x) => x.id === t.itemId)
    if (it) {
      it.qtyOnHand = Math.max(0, (it.qtyOnHand || 0) - t.qty)
      saveAllItems(its)
    }
  }
  // else: field/dietitian-side debit would go through window.QMS_InvField
  // .adjustAllocation(t.from, t.itemId, -t.qty) — that module doesn't exist
  // in this build yet, so the delta is silently skipped, matching the
  // prototype's own `else if (window.QMS_InvField)` guard exactly.

  t.status = 'IN_TRANSIT'
  persistTransfersStore(rows)
  return t
}

// saveDeliver() — exact port of inventory-warehouse.js:361-377. Stock arrives
// at the DESTINATION on delivery (not on dispatch): CENTRAL destination
// credits the shared item store's qtyOnHand; any other destination delegates
// to window.QMS_InvField.adjustAllocation (silently skipped here, same
// degrade path as dispatchTransfer() above — that module doesn't exist yet).
export interface DeliverPodInput {
  ref: string
  by: string
  at: string
  photo: string
}

export function saveDeliver(id: string, pod: DeliverPodInput): Transfer {
  const ref = (pod.ref || '').trim()
  if (!ref) throw new Error('POD reference is required')

  const rows = getTransfers()
  const t = rows.find((x) => x.id === id)
  if (!t) throw new Error('Transfer not found')

  if (t.to === CENTRAL) {
    const its = getItems()
    const it = its.find((x) => x.id === t.itemId)
    if (it) {
      it.qtyOnHand = (it.qtyOnHand || 0) + t.qty
      saveAllItems(its)
    }
  }
  // else: field/dietitian-side credit would go through window.QMS_InvField
  // .adjustAllocation(t.to, t.itemId, +t.qty, item.batchNo, item.expiryDate) —
  // silently skipped, same degrade path as dispatchTransfer() above.

  t.status = 'DELIVERED'
  t.pod = { ref, by: pod.by || 'Destination', at: pod.at || isoDate(new Date()), photo: pod.photo || '' }
  persistTransfersStore(rows)
  return t
}

// Default POD reference prefill for the Deliver+POD modal — exact port of
// openDeliver()'s `'POD-' + (7800 + transfers().length)` expression. Takes
// the transfer COUNT directly (not the array) since the only thing the
// prototype's own expression reads off transfers() is its .length.
export function nextPodRef(transferCount: number): string {
  return 'POD-' + (7800 + transferCount)
}
