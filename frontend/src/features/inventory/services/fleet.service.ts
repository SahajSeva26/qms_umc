// Fleet domain service — device fleet units and calibration lifecycle. This
// app has no vehicles/drivers; "Fleet" here means the physical device fleet
// synthesized from the catalog (seedUnits) plus its calibration status/
// actions. FO Inventory (per-FO holdings) lives in ./movement.service
// alongside the Field Ops allocation ledger it reads — keeping that
// dependency one-directional (fleet → movement only, via the movement log
// used by markCalibrated). Split out of the original inventory.service.ts
// (Phase 3 service breakup) — every function below is moved verbatim, no
// behavior change.

import type { Person } from '@/types/people.types'
import type {
  InventoryUnit, CalibStatus, DeviceFleet, Movement, DeviceCatalogItem,
} from '@/features/inventory/inventory.types'
import { INVENTORY_HUBS } from '@/features/inventory/inventory.types'
import { addDays, isoDate } from './shared/date'
import { loadUnitsStore, persistUnitsStore } from './shared/unitsStore'
import { getDeviceCatalog } from './inventory.service'
import { loadMovementsStore, persistMovementsStore } from './movement.service'

// ============================================================================
// Fleet units (window.QMS_MASTER units store, seedUnits()/calibStatus()/
// deviceFleet() — inventory.js lines 165-257). One record per physical
// serialized unit, synthesized from each catalog device's unitsAvailable+
// unitsDeployed count, persisted to localStorage (qms.inventory.units) — a
// SEPARATE store from the qms.inventory.items registry above. Shared by the
// Overview/Devices/Calibration/Assignments/Movements tabs; do not re-declare
// this engine elsewhere (it previously accumulated duplicate copies from
// concurrent tab-building passes, which broke `tsc`).
// ============================================================================

// seedUnits() — exact port of inventory.js:165-219. Synthesizes one record
// per physical unit across every catalog device (unitsAvailable+unitsDeployed
// total), staggers each unit's lastCalibrated date via a deterministic
// LCG-seeded PRNG (seed = seed*9301+49297 mod 233280 — NOT Math.random(), so
// results are stable run-to-run within a single seeding pass), and
// distributes non-deployed units across the 6 fixed hubs. Idempotent +
// persisted: only re-seeds when the stored unit count is below the catalog's
// current total desired count, exactly mirroring the prototype's
// `cur.length >= total` short-circuit.
//
// `fosForBinding` is passed in (rather than read from a module-level store)
// because this React port's Person roster lives behind usePeopleData(), not
// a global window.QMS_MASTER.people — callers seed once they have the FO
// list loaded.
export function seedUnits(fosForBinding: Person[] = []): InventoryUnit[] {
  const cat = getDeviceCatalog()
  const total = cat.reduce((a, d) => a + (d.unitsAvailable || 0) + (d.unitsDeployed || 0), 0)
  const cur = loadUnitsStore()
  if (cur && cur.length >= total) return cur

  const list: InventoryUnit[] = cur ? [...cur] : []
  const existing = new Set(list.map((u) => u.id))
  let seed = 1
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }

  cat.forEach((d) => {
    const want = (d.unitsAvailable || 0) + (d.unitsDeployed || 0)
    let have = list.filter((u) => u.deviceId === d.id).length
    let n = have + 1
    while (have < want) {
      const sn = (d.type || 'DEV').replace(/\s+/g, '').toUpperCase().slice(0, 4) + '-' + String(n).padStart(4, '0')
      const id = d.id + ':' + sn
      if (!existing.has(id)) {
        const offset = Math.floor(rng() * d.calibIntervalDays)
        const lastCal = addDays(new Date(), -offset)
        const nextCal = addDays(lastCal, d.calibIntervalDays)
        const isDeployed = have < (d.unitsDeployed || 0)
        const hub = INVENTORY_HUBS[Math.floor(rng() * INVENTORY_HUBS.length)]
        list.push({
          id,
          sn,
          deviceId: d.id,
          deviceType: d.type,
          status: 'ACTIVE',
          lastCalibrated: isoDate(lastCal),
          nextCalibration: isoDate(nextCal),
          assignedTo: '',
          location: isDeployed ? null : hub,
          qrCode: 'QR-' + sn,
        })
        existing.add(id)
      }
      n++
      have = list.filter((u) => u.deviceId === d.id).length
    }
  })

  // Bind deployed units to FOs based on machinesAssigned (best-effort) —
  // exact port of inventory.js:206-216.
  fosForBinding
    .filter((p) => p.role === 'Field Officer' && !p.relievedOn)
    .forEach((fo) => {
      ;(fo.machinesAssigned || []).forEach((devId) => {
        const unit = list.find((u) => u.deviceId === devId && !u.assignedTo && !u.location)
        if (unit) unit.assignedTo = fo.id
      })
    })

  persistUnitsStore(list)
  return list
}

// calibStatus() — exact port (inventory.js:240-245). days = ceil((next -
// now)/86400000); negative → OVER (abs days shown), <14 → SOON, else OK.
export function calibStatus(unit: InventoryUnit): CalibStatus {
  const days = Math.ceil((new Date(unit.nextCalibration).getTime() - Date.now()) / 86400000)
  if (days < 0) return { code: 'OVER', label: `Overdue · ${Math.abs(days)}d`, days }
  if (days < 14) return { code: 'SOON', label: `Due in ${days}d`, days }
  return { code: 'OK', label: `Calibrated · next ${days}d`, days }
}

// deviceFleet() — exact port (inventory.js:247-257). Per-catalog-device
// rollup of its (non-retired) seeded units. NOTE the deliberate divergence
// from the Overview tab's 'Fleet value' KPI: that KPI sums the catalog's raw
// unitsAvailable+unitsDeployed fields (never mutated), whereas this reads the
// SEEDED per-unit array (mutable via the Movements tab's RETIRE action) — the
// two totals usually agree but can drift once units are retired. Do not "fix"
// this by unifying the two computations; replicate it faithfully.
export function deviceFleet(units: InventoryUnit[], deviceId: string): DeviceFleet {
  const list = units.filter((u) => u.deviceId === deviceId && u.status !== 'RETIRED')
  return {
    total: list.length,
    deployed: list.filter((u) => u.assignedTo).length,
    available: list.filter((u) => !u.assignedTo && u.status === 'ACTIVE').length,
    overdue: list.filter((u) => calibStatus(u).code === 'OVER').length,
    soon: list.filter((u) => calibStatus(u).code === 'SOON').length,
    units: list,
  }
}

// ============================================================================
// Calibration tab (tabCalibration()/window.invMarkCalibrated(), inventory.js
// lines 577-645) — the fleet-wide per-serial view across every device type,
// with an inline one-click "Mark done" action per overdue/soon-due row.
// Reuses the shared seedUnits()/calibStatus() engine above (same
// qms.inventory.units store as Devices/Overview/Assignments/Movements).
// ============================================================================

export interface EnrichedCalibRow {
  u: InventoryUnit
  dev: DeviceCatalogItem
  fo: Person | undefined
  cs: CalibStatus
}

// tabCalibration()'s `enriched` list — exact port of inventory.js:582-593.
// Drops units whose device lookup fails (data integrity guard), then applies
// type/status/search filters, then sorts ascending by cs.days (most-overdue/
// soonest-due floats to the top regardless of active filter).
export function buildCalibrationRows(units: InventoryUnit[], people: Person[], type: string, status: string, q: string): EnrichedCalibRow[] {
  const cat = getDeviceCatalog()
  const query = q.trim().toLowerCase()

  const enriched: EnrichedCalibRow[] = []
  units.forEach((u) => {
    const dev = cat.find((d) => d.id === u.deviceId)
    if (!dev) return
    const fo = people.find((p) => p.id === u.assignedTo)
    const cs = calibStatus(u)
    enriched.push({ u, dev, fo, cs })
  })

  return enriched
    .filter((r) => {
      if (type !== 'ALL' && r.dev.type !== type) return false
      if (status !== 'ALL' && r.cs.code !== status) return false
      if (query && !((r.u.sn || '').toLowerCase().includes(query) || (r.dev.type || '').toLowerCase().includes(query) || (r.fo?.name || '').toLowerCase().includes(query))) return false
      return true
    })
    .sort((a, b) => a.cs.days - b.cs.days)
}

// window.invMarkCalibrated() — exact port of inventory.js:620-645. One-click,
// no-confirmation mutation: sets lastCalibrated=today, nextCalibration=today+
// calibIntervalDays, persists the mutated units array, then PREPENDS a
// synthetic 'CALIB' movement record (id='MV-{1100+existingMovementsCount}',
// from=unit.location || assigned FO's name || '—', to='Service Center') and
// persists that too. Returns the updated unit + movement so the caller can
// build the success toast copy ('{sn} calibrated · next {nextCalibration}').
export function markCalibrated(unitId: string, people: Person[]): { unit: InventoryUnit; movement: Movement } {
  const units = loadUnitsStore() || []
  const idx = units.findIndex((x) => x.id === unitId)
  if (idx === -1) throw new Error('Unit not found')
  const dev = getDeviceCatalog().find((d) => d.id === units[idx].deviceId)
  if (!dev) throw new Error('Device not found')

  const now = new Date()
  const nextUnits = units.map((x) => ({ ...x }))
  const u = nextUnits[idx]
  u.lastCalibrated = isoDate(now)
  u.nextCalibration = isoDate(addDays(now, dev.calibIntervalDays))
  persistUnitsStore(nextUnits)

  const movs = loadMovementsStore() || []
  const fo = people.find((p) => p.id === u.assignedTo)
  const m: Movement = {
    id: 'MV-' + (1100 + movs.length),
    date: isoDate(now),
    type: 'CALIB',
    unitId: u.id,
    deviceType: dev.type,
    from: u.location || fo?.name || '—',
    to: 'Service Center',
    notes: 'Calibration completed · next ' + u.nextCalibration,
    by: 'Inventory module',
  }
  movs.unshift(m)
  persistMovementsStore(movs)

  return { unit: u, movement: m }
}
