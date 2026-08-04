import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from '@/features/inventory/inventory.service'
import type { ItemFormValues } from '@/features/inventory/inventory.service'
import { INVENTORY_FILTER_DEFAULTS } from '@/features/inventory/inventory.types'
import type { InventoryUnit, DashboardSubView, FieldOpsSegment } from '@/features/inventory/inventory.types'
import { usePeopleData } from '@/hooks/usePeopleData'

// Mock/frontend-only catalogs — no real backend module exists yet (same
// pattern as features/reminders and features/hq). Query hooks exist mainly
// to keep this feature's data-access shape consistent with the rest of the
// app (TanStack Query) even though the underlying data is a static list.
export const useConsumables = () => {
  const { data: consumables = [], isLoading, error } = useQuery({
    queryKey: ['inventory', 'consumables'],
    queryFn: async () => service.getConsumables(),
  })

  return { consumables, isLoading, error }
}

export const useDeviceCatalog = () => {
  const { data: devices = [], isLoading, error } = useQuery({
    queryKey: ['inventory', 'devices'],
    queryFn: async () => service.getDeviceCatalog(),
  })

  return { devices, isLoading, error }
}

export const useTestCatalog = () => {
  const { data: tests = [], isLoading, error } = useQuery({
    queryKey: ['inventory', 'tests'],
    queryFn: async () => service.getTests(),
  })

  return { tests, isLoading, error }
}

// ── Item Master (qms.inventory.items, inventory-masters.js) ────────────────
// The unified item registry backing the Item Master / Expiry-FEFO / Field
// Ops / Procurement tabs. seed() runs lazily inside service.getItems() (only
// gated by the query's own `enabled`, never by a sentinel param) — this hook
// is always enabled since the mock store needs no external input to seed.
export const useItemMaster = () => {
  const queryClient = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: async () => service.getItems(),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] })

  const saveMutation = useMutation({
    mutationFn: async ({ editId, form }: { editId: string | null; form: ItemFormValues }) => service.saveItem(editId, form),
    onSuccess: invalidate,
  })

  return {
    items,
    isLoading,
    error,
    saveItem: (editId: string | null, form: ItemFormValues) => saveMutation.mutateAsync({ editId, form }),
  }
}

// Local filter-state slice for the Item Master tab (type/q) — mirrors the
// prototype's module-level mutable `MST.f` object; each tab instance owns its
// own slice instead of a shared global.
export const useItemMasterFilters = () => {
  const [type, setType] = useState<string>(INVENTORY_FILTER_DEFAULTS.type)
  const [q, setQ] = useState<string>(INVENTORY_FILTER_DEFAULTS.q)

  // setType() — exact port (inventory-masters.js:725): clicking an already-
  // active type-strip card toggles back to 'ALL'; the type <select> just sets
  // directly (never toggles) — callers choose which behavior they want.
  const toggleType = (t: string) => setType((cur) => (cur === t ? 'ALL' : t))

  return { type, setType, toggleType, q, setQ }
}

export const useItemMasterList = (items: ReturnType<typeof useItemMaster>['items'], type: string, q: string) => {
  return useMemo(() => service.filterItems(items, type, q), [items, type, q])
}

// ── Devices tab (seedUnits()/deviceFleet()/calibStatus(), inventory.js
// lines 165-257) ─────────────────────────────────────────────────────────
// The per-serial fleet-unit ledger (qms.inventory.units) shared by the
// Devices/Calibration/Assignments/Movements tabs. seedUnits() needs the FO
// roster (Person[]) to bind deployed units by machinesAssigned, so this
// query is genuinely gated on the people list being loaded — never via a
// sentinel query param, via TanStack Query's own `enabled` boolean.
export const useDeviceFleetUnits = () => {
  const { people, isLoading: peopleLoading } = usePeopleData()
  const { data: units = [], isLoading, error } = useQuery({
    queryKey: ['inventory', 'units', people.length],
    queryFn: async () => service.seedUnits(people),
    enabled: !peopleLoading,
  })

  return { units, people, isLoading: peopleLoading || isLoading, error }
}

// deviceFleet() rollup for one catalog device — exact port of
// inventory.js:247-257, recomputed from the shared seeded units list.
export const useDeviceFleet = (units: ReturnType<typeof useDeviceFleetUnits>['units'], deviceId: string) => {
  return useMemo(() => service.deviceFleet(units, deviceId), [units, deviceId])
}

// ── Warehouse tab (qms.inventory.items/transfers/dietitians,
// inventory-warehouse.js) ───────────────────────────────────────────────────
// Central Warehouse stock (consumableItems()) reads the SAME shared Item
// Master store as useItemMaster() above, so this hook shares that query key
// — invalidating either one keeps both in sync. Transfers/dietitians need
// the live FO roster (Person[]) to seed their demo rows, so — per this
// codebase's enabled-gating discipline (never a sentinel query param) —
// both queries are genuinely gated on `enabled: !peopleLoading`, not fired
// with an empty/placeholder people[] and re-fired later.
export const useWarehouse = () => {
  const { people, isLoading: peopleLoading } = usePeopleData()
  const queryClient = useQueryClient()

  const { data: items = [], isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: async () => service.getItems(),
  })

  const { data: dietitians = [], isLoading: dietLoading, error: dietError } = useQuery({
    queryKey: ['inventory', 'dietitians'],
    queryFn: async () => service.getDietitians(),
  })

  const { data: transfers = [], isLoading: transfersLoading, error: transfersError } = useQuery({
    queryKey: ['inventory', 'transfers', people.length],
    queryFn: async () => {
      service.primeTransfersSeed(people)
      return service.getTransfers()
    },
    enabled: !peopleLoading,
  })

  const invalidateTransfers = () => queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] })

  const saveTransferMutation = useMutation({
    mutationFn: async (input: service.NewTransferInput) => service.saveTransfer(input),
    onSuccess: invalidateTransfers,
  })

  return {
    people,
    items,
    dietitians,
    transfers,
    isLoading: peopleLoading || itemsLoading || dietLoading || transfersLoading,
    error: itemsError || dietError || transfersError,
    saveTransfer: (input: service.NewTransferInput) => saveTransferMutation.mutateAsync(input),
  }
}

// consumableItems() slice + valuation numbers for the Warehouse tab's 4
// location cards + stock table — recomputed whenever the underlying items/
// dietitians/transfers/people change, exact port of inventory-warehouse.js's
// centralValue()/foFieldValue()/dietFieldValue()/transitValue().
export const useWarehouseNetwork = (data: ReturnType<typeof useWarehouse>) => {
  const { people, items, dietitians, transfers } = data
  return useMemo(() => {
    const stock = service.consumableItems()
    const central = service.centralValue()
    const foVal = service.foFieldValue(people)
    const dietVal = service.dietFieldValue()
    const transit = service.transitValue()
    const fos = service.allFos(people)
    return { stock, central, foVal, dietVal, transit, fos }
    // items/dietitians/transfers are read from the shared localStorage-backed
    // service store, not passed as args to these pure fns — they're listed
    // as deps purely so this recomputes after a mutation invalidates them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, items, dietitians, transfers])
}

// ── Overview tab (renderKpis()/renderAi()/tabOverview(), inventory.js lines
// 321-520) ───────────────────────────────────────────────────────────────
// Reuses the same shared seeded-units query as the Devices tab (useDeviceFleetUnits)
// so KPI counts agree across tabs — Overview only adds its own derived
// computations (KPI cards, AI summary, fleet-by-type bars, consumables
// status mix, overdue-units slice) on top of that one shared units list.
export const useInventoryOverview = () => {
  const { units, people, isLoading, error } = useDeviceFleetUnits()
  const { consumables } = useConsumables()

  const kpis = useMemo(() => service.buildInventoryKpis(units), [units])
  const aiSummary = useMemo(() => service.buildInventoryAiSummary(units), [units])
  const fleetByType = useMemo(() => service.fleetByDeviceType(), [])
  const statusMix = useMemo(() => service.consumablesStatusMix(), [consumables])
  const overdueUnits = useMemo(() => service.overdueUnitsForOverview(units), [units])
  const criticalConsumables = useMemo(() => service.criticalConsumables(), [consumables])

  return {
    units,
    people,
    isLoading,
    error,
    kpis,
    aiSummary,
    fleetByType,
    statusMix,
    overdueUnits,
    criticalConsumables,
  }
}

// ── Calibration tab (tabCalibration()/window.invMarkCalibrated(),
// inventory.js lines 577-645) ───────────────────────────────────────────────
// Reuses the same shared seeded-units query as Devices/Overview
// (useDeviceFleetUnits) so the fleet-wide per-serial list agrees with every
// other tab reading qms.inventory.units.
export const useCalibrationRows = (
  units: ReturnType<typeof useDeviceFleetUnits>['units'],
  people: ReturnType<typeof useDeviceFleetUnits>['people'],
  type: string,
  status: string,
  q: string,
) => {
  return useMemo(() => service.buildCalibrationRows(units, people, type, status, q), [units, people, type, status, q])
}

// Local filter-state slice for the Calibration tab (type/status/q) — mirrors
// the prototype's module-level mutable `state.filter` object; each tab
// instance owns its own slice instead of a shared global.
export const useCalibrationFilters = () => {
  const [type, setType] = useState<string>(INVENTORY_FILTER_DEFAULTS.type)
  const [status, setStatus] = useState<string>(INVENTORY_FILTER_DEFAULTS.status)
  const [q, setQ] = useState<string>(INVENTORY_FILTER_DEFAULTS.q)

  return { type, setType, status, setStatus, q, setQ }
}

// window.invMarkCalibrated() — one-click, no-confirmation mutation (matches
// the prototype exactly: no modal/confirm step). Also appends a synthetic
// CALIB movement record (service.markCalibrated's own doing), so both the
// shared units query AND the movements query are invalidated in sync.
export const useMarkCalibrated = () => {
  const queryClient = useQueryClient()
  const { people } = usePeopleData()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'units'] })
    queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
  }

  const markMutation = useMutation({
    mutationFn: async (unitId: string) => service.markCalibrated(unitId, people),
    onSuccess: invalidate,
  })

  return {
    markCalibrated: (unitId: string) => markMutation.mutateAsync(unitId),
  }
}

// ── Vendors (window.QMS_InvProc, inventory-procurement.js) ─────────────────
// seedVendors()/seedPriceHistory() run lazily inside service.getVendors()/
// getPriceHistory() (gated only by the query's own enabled/queryFn, never a
// sentinel param) — both are always-enabled since the mock stores need no
// external input to seed, same as useItemMaster() above.
export const useVendors = () => {
  const queryClient = useQueryClient()
  const { data: vendors = [], isLoading, error } = useQuery({
    queryKey: ['inventory', 'vendors'],
    queryFn: async () => service.getVendors(),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['inventory', 'vendors'] })

  const saveMutation = useMutation({
    mutationFn: async ({ editId, form }: { editId: string | null; form: service.VendorFormValues }) => service.saveVendor(editId, form),
    onSuccess: invalidate,
  })

  return {
    vendors,
    isLoading,
    error,
    saveVendor: (editId: string | null, form: service.VendorFormValues) => saveMutation.mutateAsync({ editId, form }),
  }
}

// Price history feeds the Vendor Detail drawer's trend table — a separate
// query so it can seed independently of the vendor roster query above (both
// gated only by their own queryFn, never a sentinel param).
export const useVendorPriceHistory = () => {
  const { data: priceHistory = [], isLoading, error } = useQuery({
    queryKey: ['inventory', 'priceHistory'],
    queryFn: async () => service.getPriceHistory(),
  })

  return { priceHistory, isLoading, error }
}

// ── Movements tab (tabMovements(), inventory.js lines 749-786) ─────────────
// The full ledger table, newest-first — reads the same shared seeded-units
// query as Devices/Overview/Calibration (useDeviceFleetUnits) so unitId→
// deviceType/serial lookups agree with every other tab, then layers its own
// seedMovementsIfEmpty() query on top. Genuinely gated on the units list
// being ready via TanStack Query's own `enabled`, never a sentinel param —
// seedMovementsIfEmpty() needs a live units[] to filter out rows whose
// referenced unit doesn't exist.
export const useMovements = () => {
  const { units, people, isLoading: unitsLoading } = useDeviceFleetUnits()
  const { data: movements = [], isLoading: movementsLoading, error } = useQuery({
    queryKey: ['inventory', 'movements', units.length],
    queryFn: async () => service.getMovements(units),
    enabled: !unitsLoading,
  })

  return { movements, units, people, isLoading: unitsLoading || movementsLoading, error }
}

// ── Transfers tab (window.QMS_InvWh.tabTransfers()/balancingSuggestions()/
// dispatch()/openDeliver()/saveDeliver(), inventory-warehouse.js:218-377) ──
// Reuses the SAME shared transfers/items/people queries as useWarehouse()
// above (same qms.inventory.transfers + qms.inventory.items stores) so both
// tabs stay in sync — invalidating one tab's mutation refreshes the other's
// view of the same data.
export const useTransfers = () => {
  const { people, isLoading: peopleLoading } = usePeopleData()
  const queryClient = useQueryClient()

  const { data: items = [], isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: async () => service.getItems(),
  })

  const { data: transfers = [], isLoading: transfersLoading, error: transfersError } = useQuery({
    queryKey: ['inventory', 'transfers', people.length],
    queryFn: async () => {
      service.primeTransfersSeed(people)
      return service.getTransfers()
    },
    enabled: !peopleLoading,
  })

  const invalidateTransfers = () => queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] })
  const invalidateItems = () => queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] })

  const saveTransferMutation = useMutation({
    mutationFn: async (input: service.NewTransferInput) => service.saveTransfer(input),
    onSuccess: invalidateTransfers,
  })

  const dispatchMutation = useMutation({
    mutationFn: async (id: string) => service.dispatchTransfer(id),
    onSuccess: () => {
      invalidateTransfers()
      invalidateItems()
    },
  })

  const deliverMutation = useMutation({
    mutationFn: async ({ id, pod }: { id: string; pod: service.DeliverPodInput }) => service.saveDeliver(id, pod),
    onSuccess: () => {
      invalidateTransfers()
      invalidateItems()
    },
  })

  return {
    people,
    items,
    transfers,
    isLoading: peopleLoading || itemsLoading || transfersLoading,
    error: itemsError || transfersError,
    saveTransfer: (input: service.NewTransferInput) => saveTransferMutation.mutateAsync(input),
    dispatchTransfer: (id: string) => dispatchMutation.mutateAsync(id),
    saveDeliver: (id: string, pod: service.DeliverPodInput) => deliverMutation.mutateAsync({ id, pod }),
  }
}

// Logistics rollup strip (Logistics spend / Cost per transfer / Cost per camp
// / Cost per patient) — recomputed whenever the transfers list changes.
export const useTransfersRollup = (transfers: ReturnType<typeof useTransfers>['transfers']) => {
  return useMemo(() => service.transfersLogisticsRollup(transfers), [transfers])
}

// Emergency stock-balancing panel — exact port of balancingSuggestions().
// No foHoldings() engine exists yet in this build (FO Inventory/Item Master
// per-FO holdings tab isn't built), so this always degrades to the
// `suggestion: null` branch, matching the prototype's own guard exactly —
// once that engine lands, thread it in here as the first argument.
export const useBalancingSuggestions = (people: ReturnType<typeof useTransfers>['people']) => {
  return useMemo(() => service.balancingSuggestions(undefined, people), [people])
}

// ── Log inventory movement modal (window.invNewMovement(), inventory.js
// lines 789-876) — reachable from the shared page-head "New transfer" button
// on every tab including Overview, and from the Movements tab's own "+ Log
// movement" button (the SAME modal in both places — distinct from the
// Warehouse/Transfers tabs' own separate stock-transfer modal). Mutates both
// the movements ledger and (depending on type) the underlying unit's live
// state, so a successful log invalidates both shared queries. ─────────────
export const useLogMovement = () => {
  const queryClient = useQueryClient()
  const { people } = usePeopleData()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'units'] })
    queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] })
  }

  const logMutation = useMutation({
    mutationFn: async ({ input, units }: { input: service.LogMovementInput; units: InventoryUnit[] }) =>
      service.logMovement(input, units, service.allFos(people)),
    onSuccess: invalidate,
  })

  return {
    logMovement: (input: service.LogMovementInput, units: InventoryUnit[]) => logMutation.mutateAsync({ input, units }),
  }
}

// ── Dashboards tab (window.QMS_InvIntel.tabDashboards()/dashBody(),
// inventory-intel.js lines 175-315) — 8 sub-views, each its own kpiGrid() +
// supporting table, all derived from the shared units/items/transfers/
// vendors/priceHistory stores plus the mock PR/PO/GRN/refill/field-report
// seeds added alongside this tab. Reuses the SAME shared seeded-units query
// as Devices/Overview/Calibration (useDeviceFleetUnits) so fleet counts agree
// across every tab. No foHoldings() engine exists yet (FO Inventory/Item
// Master per-FO holdings tab isn't built), so valuation()'s fieldValue
// degrades to 0 exactly like the prototype's own guard — once that engine
// lands, thread it in here as buildDashboardsData's 3rd argument.
export const useDashboardsData = () => {
  const { units, people, isLoading: unitsLoading } = useDeviceFleetUnits()

  const { data, isLoading: dataLoading, error } = useQuery({
    queryKey: ['inventory', 'dashboards', units.length, people.length],
    queryFn: async () => service.buildDashboardsData(units, people),
    enabled: !unitsLoading,
  })

  return {
    data,
    isLoading: unitsLoading || dataLoading,
    error,
  }
}

// Local sub-view state (Executive/Inventory/Procurement/.../Operations) —
// mirrors the prototype's module-local mutable `IN.dash` — plain useState,
// no manual DOM re-render needed in the React port (see research spec).
export const useDashboardSubView = () => {
  const [sub, setSub] = useState<DashboardSubView>('exec')
  return { sub, setSub }
}

// ── FO Inventory tab (window.QMS_InvMasters.tabFoInventory()/foHoldings(),
// inventory-masters.js lines 569-722) ──────────────────────────────────────
// Reuses the SAME shared seeded-units query as Devices/Overview/Calibration/
// Movements (useDeviceFleetUnits) so per-FO device holdings agree with every
// other tab reading qms.inventory.units — genuinely gated on `enabled:
// !unitsLoading` via TanStack Query's own boolean, never a sentinel param.
export const useFoInventoryRows = () => {
  const { units, people, isLoading: unitsLoading } = useDeviceFleetUnits()

  const { data: rows = [], isLoading: rowsLoading, error } = useQuery({
    queryKey: ['inventory', 'foinventory', units.length, people.length],
    queryFn: async () => service.buildFoInventoryRows(units, people),
    enabled: !unitsLoading,
  })

  return { rows, units, people, isLoading: unitsLoading || rowsLoading, error }
}

// Per-FO holdings recompute for the drawer (openFoInventory()) — exact port
// of foHoldings(foId), reusing the same shared units/people already loaded by
// useFoInventoryRows() above so opening the drawer needs no extra query.
export const useFoHoldings = (
  foId: string | null,
  units: ReturnType<typeof useDeviceFleetUnits>['units'],
  people: ReturnType<typeof useDeviceFleetUnits>['people'],
) => {
  return useMemo(() => (foId ? service.foHoldings(foId, units, people) : null), [foId, units, people])
}

// ── Procurement tab (window.QMS_InvProc.tabProcurement(), inventory-
// procurement.js:336-641) — the real persisted PR → PO → GRN pipeline.
// Reuses the SAME qms.inventory.prs/pos/grns stores the Dashboards tab reads
// via service.getPrs/getPos/getGrns (seedProcurementDocs()'s one-time seed),
// so every mutation here invalidates the one shared query key set both tabs
// read from. Always-enabled (no external input needed to seed), same as
// useVendors()/useItemMaster() above.
export const useProcurement = () => {
  const queryClient = useQueryClient()

  const { data: prs = [], isLoading: prsLoading, error: prsError } = useQuery({
    queryKey: ['inventory', 'prs'],
    queryFn: async () => service.getPrs(),
  })
  const { data: pos = [], isLoading: posLoading, error: posError } = useQuery({
    queryKey: ['inventory', 'pos'],
    queryFn: async () => service.getPos(),
  })
  const { data: grns = [], isLoading: grnsLoading, error: grnsError } = useQuery({
    queryKey: ['inventory', 'grns'],
    queryFn: async () => service.getGrns(),
  })
  // Vendors + the shared item-master store are both read by the New PR /
  // Generate PO modals (item picker, vendor picker, vendorByName lookups).
  const { vendors } = useVendors()
  const { items } = useItemMaster()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'prs'] })
    queryClient.invalidateQueries({ queryKey: ['inventory', 'pos'] })
    queryClient.invalidateQueries({ queryKey: ['inventory', 'grns'] })
    // A GRN mutates the shared item store's qtyOnHand/batchNo/expiryDate too.
    queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] })
  }

  const savePRMutation = useMutation({
    mutationFn: async (form: service.PrFormValues) => service.savePR(form),
    onSuccess: invalidate,
  })
  const advancePRMutation = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => service.advancePR(id, approve),
    onSuccess: invalidate,
  })
  const autoReorderMutation = useMutation({
    mutationFn: async () => service.autoReorder(),
    onSuccess: invalidate,
  })
  const prToPOMutation = useMutation({
    mutationFn: async (prId: string) => service.prToPO(prId),
    onSuccess: invalidate,
  })
  const savePOCreateMutation = useMutation({
    mutationFn: async (form: service.PoCreateFormValues) => service.savePOCreate(form),
    onSuccess: invalidate,
  })
  const approvePOMutation = useMutation({
    mutationFn: async (id: string) => service.approvePO(id),
    onSuccess: invalidate,
  })
  const rejectPOMutation = useMutation({
    mutationFn: async (id: string) => service.rejectPO(id),
    onSuccess: invalidate,
  })
  const saveGRNMutation = useMutation({
    mutationFn: async ({ poId, form }: { poId: string; form: service.GrnFormValues }) => service.saveGRN(poId, form),
    onSuccess: invalidate,
  })

  return {
    prs,
    pos,
    grns,
    vendors,
    items,
    isLoading: prsLoading || posLoading || grnsLoading,
    error: prsError || posError || grnsError,
    savePR: (form: service.PrFormValues) => savePRMutation.mutateAsync(form),
    advancePR: (id: string, approve: boolean) => advancePRMutation.mutateAsync({ id, approve }),
    autoReorder: () => autoReorderMutation.mutateAsync(),
    prToPO: (prId: string) => prToPOMutation.mutateAsync(prId),
    savePOCreate: (form: service.PoCreateFormValues) => savePOCreateMutation.mutateAsync(form),
    approvePO: (id: string) => approvePOMutation.mutateAsync(id),
    rejectPO: (id: string) => rejectPOMutation.mutateAsync(id),
    saveGRN: (poId: string, form: service.GrnFormValues) => saveGRNMutation.mutateAsync({ poId, form }),
  }
}

// Local segmented-control state (Requisitions/Purchase Orders/Goods Receipt)
// — mirrors the prototype's module-level mutable `PROC.seg` object; plain
// useState, no manual DOM re-render needed in the React port.
export type ProcurementSeg = 'PR' | 'PO' | 'GRN'
export const useProcurementSeg = () => {
  const [seg, setSeg] = useState<ProcurementSeg>('PR')
  return { seg, setSeg }
}

// ── Forecast tab (window.QMS_InvIntel.tabForecast()/viewDemand()/
// viewConsumption(), inventory-intel.js lines 318-393) ─────────────────────
// Demand forecast sub-view: forecast(windowDays) is pure/synchronous (no
// external input needed beyond the shared items store, which self-seeds), so
// it's recomputed via useMemo off the window-selector state rather than a
// separate TanStack Query — same treatment as useDashboardSubView's local
// `sub` selector, since there's nothing async to gate here.
export const useForecastWindow = () => {
  const [win, setWin] = useState(30)
  return { win, setWin }
}

export const useDemandForecast = (win: number) => {
  return useMemo(() => service.forecast(win), [win])
}

// Camp Consumption Engine sub-view: needs the shared seeded-units + people
// roster (foConsumableHoldings() inside applyConsumption() reads both), so
// the camp list + selection state + mutation are genuinely gated on
// `enabled: !unitsLoading` via useDeviceFleetUnits, never a sentinel param.
export const useConsumptionCamps = () => {
  return useMemo(() => service.consumptionCamps(), [])
}

export const useConsumedCamps = () => {
  const queryClient = useQueryClient()
  const { data: consumed = [], isLoading, error } = useQuery({
    queryKey: ['inventory', 'consumedCamps'],
    queryFn: async () => service.consumedCamps(),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'consumedCamps'] })
    queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] })
  }

  const { units, people, isLoading: unitsLoading } = useDeviceFleetUnits()

  const applyMutation = useMutation({
    mutationFn: async (campId: string) => service.applyConsumption(campId, units, people),
    onSuccess: invalidate,
  })

  return {
    consumed,
    isLoading: isLoading || unitsLoading,
    error,
    applyConsumption: (campId: string) => applyMutation.mutateAsync(campId),
  }
}

// ── Field Ops tab (window.QMS_InvField.tabFieldOps(), inventory-field.js) ──
// Refills + reports + the allocations ledger all need the fleet-unit ledger
// (units) and FO/dietitian roster (people) to seed — seedFieldOps() derives
// each FO's starting allocation kit via foConsumableHoldings(), which itself
// reads the shared qms.inventory.units store. Genuinely gated on `enabled:
// !unitsLoading` via useDeviceFleetUnits, never a sentinel query param.
export const useFieldOps = () => {
  const { units, people, isLoading: unitsLoading } = useDeviceFleetUnits()
  const queryClient = useQueryClient()

  const { data: refills = [], isLoading: refillsLoading, error: refillsError } = useQuery({
    queryKey: ['inventory', 'fieldops', 'refills', units.length, people.length],
    queryFn: async () => service.getRefills(units, people),
    enabled: !unitsLoading,
  })

  const { data: reports = [], isLoading: reportsLoading, error: reportsError } = useQuery({
    queryKey: ['inventory', 'fieldops', 'reports', units.length, people.length],
    queryFn: async () => service.getFieldReports(units, people),
    enabled: !unitsLoading,
  })

  // Allocations aren't fetched as their own query — holderHoldings()/holders()
  // are pure/synchronous reads off the same localStorage ledger, recomputed
  // via useMemo in the component after each mutation invalidates this key set
  // (matching the prototype's own rerender()-on-every-mutation model).
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'fieldops'] })
    queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] })
  }

  const approveRefillMutation = useMutation({
    mutationFn: async (id: string) => service.approveRefill(id),
    onSuccess: invalidate,
  })
  const rejectRefillMutation = useMutation({
    mutationFn: async (id: string) => service.rejectRefill(id),
    onSuccess: invalidate,
  })
  const dispatchRefillMutation = useMutation({
    mutationFn: async (id: string) => service.dispatchRefill(id),
    onSuccess: invalidate,
  })
  const saveRefillMutation = useMutation({
    mutationFn: async (input: service.NewRefillInput) => service.saveRefill(input),
    onSuccess: invalidate,
  })
  const saveReportMutation = useMutation({
    mutationFn: async (input: service.NewReportInput) => service.saveReport(input),
    onSuccess: invalidate,
  })
  const saveLocalProcureMutation = useMutation({
    mutationFn: async (input: service.NewLocalProcureInput) => service.saveLocalProcure(input),
    onSuccess: invalidate,
  })

  return {
    units,
    people,
    refills,
    reports,
    isLoading: unitsLoading || refillsLoading || reportsLoading,
    error: refillsError || reportsError,
    approveRefill: (id: string) => approveRefillMutation.mutateAsync(id),
    rejectRefill: (id: string) => rejectRefillMutation.mutateAsync(id),
    dispatchRefill: (id: string) => dispatchRefillMutation.mutateAsync(id),
    saveRefill: (input: service.NewRefillInput) => saveRefillMutation.mutateAsync(input),
    saveReport: (input: service.NewReportInput) => saveReportMutation.mutateAsync(input),
    saveLocalProcure: (input: service.NewLocalProcureInput) => saveLocalProcureMutation.mutateAsync(input),
  }
}

// holders()/holderHoldings() recompute — pure/synchronous reads off the
// shared allocations ledger, recomputed whenever people or the mutation
// invalidation bumps `refills`/`reports` (used as a cheap "something in Field
// Ops changed" signal since the ledger itself isn't its own query).
export const useHolders = (people: ReturnType<typeof useDeviceFleetUnits>['people']) => {
  return useMemo(() => service.holders(people), [people])
}

export const useHolderHoldings = (holder: string, refreshKey: unknown) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => service.holderHoldings(holder), [holder, refreshKey])
}

// Local segment state (Refills/Issues/Allocations) — mirrors the prototype's
// module-level mutable FIELD.seg; plain useState, default 'refills'.
export const useFieldOpsSegment = () => {
  const [seg, setSeg] = useState<FieldOpsSegment>('refills')
  return { seg, setSeg }
}

// Local holder-select state for the Allocations sub-view — mirrors FIELD.holder.
export const useFieldOpsHolder = () => {
  const [holder, setHolder] = useState<string>('')
  return { holder, setHolder }
}

// ── Audit tab (window.QMS_InvIntel.tabAudit(), inventory-intel.js lines
// 449-470) — merges the shared units/people-derived Movements/Refills/Field-
// reports stores with the Transfers/PR/PO/GRN stores into one flat ledger.
// Reuses the SAME shared seeded-units query as Devices/Overview/Calibration/
// Movements (useDeviceFleetUnits) so unitId→deviceType lookups agree with
// every other tab, and primes the Transfers store's FO-dependent seed the
// same way useWarehouse()/useTransfers() do. Genuinely gated on `enabled:
// !unitsLoading` via TanStack Query's own boolean — never a sentinel param.
export const useAuditEvents = () => {
  const { units, people, isLoading: unitsLoading } = useDeviceFleetUnits()

  const { data: events = [], isLoading: eventsLoading, error } = useQuery({
    queryKey: ['inventory', 'audit', units.length, people.length],
    queryFn: async () => {
      service.primeTransfersSeed(people)
      return service.buildAuditEvents(units, people)
    },
    enabled: !unitsLoading,
  })

  return { events, isLoading: unitsLoading || eventsLoading, error }
}

// Local filter-state slice for the Audit tab's single <select> — mirrors the
// prototype's module-level mutable IN.audit (default 'ALL').
export const useAuditFilter = () => {
  const [type, setType] = useState<string>('ALL')
  return { type, setType }
}

// ── Copilot tab (window.QMS_InvIntel.tabCopilot(), inventory-intel.js lines
// 396-421) — 9 natural-language Q&A cards, every answer recomputed fresh (no
// caching) from the same shared units/people-derived stores every other tab
// reads. Reuses the SAME shared seeded-units query as Devices/Overview/
// Calibration/Movements/Dashboards/Audit (useDeviceFleetUnits) so fleet/FO
// counts agree with every other tab. Genuinely gated on `enabled:
// !unitsLoading` via TanStack Query's own boolean — never a sentinel param.
export const useCopilotData = () => {
  const { units, people, isLoading: unitsLoading } = useDeviceFleetUnits()

  const { data, isLoading: dataLoading, error } = useQuery({
    queryKey: ['inventory', 'copilot', units.length, people.length],
    queryFn: async () => service.buildCopilotData(units, people),
    enabled: !unitsLoading,
  })

  return { data, isLoading: unitsLoading || dataLoading, error }
}
