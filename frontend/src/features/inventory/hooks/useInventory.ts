import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from '@/features/inventory/inventory.service'
import type { ItemFormValues } from '@/features/inventory/inventory.service'
import { INVENTORY_FILTER_DEFAULTS } from '@/features/inventory/inventory.types'
import type { InventoryUnit, DashboardSubView, FieldOpsSegment } from '@/features/inventory/inventory.types'
import { usePeopleData } from '@/hooks/usePeopleData'

// Mock/frontend-only catalog — no real backend module exists yet.
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

// The unified item registry backing the Item Master / Expiry-FEFO / Field
// Ops / Procurement tabs.
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

export const useItemMasterFilters = () => {
  const [type, setType] = useState<string>(INVENTORY_FILTER_DEFAULTS.type)
  const [q, setQ] = useState<string>(INVENTORY_FILTER_DEFAULTS.q)

  // Clicking an already-active type toggles back to 'ALL'; the <select> just
  // sets directly (never toggles) — callers choose which behavior they want.
  const toggleType = (t: string) => setType((cur) => (cur === t ? 'ALL' : t))

  return { type, setType, toggleType, q, setQ }
}

export const useItemMasterList = (items: ReturnType<typeof useItemMaster>['items'], type: string, q: string) => {
  return useMemo(() => service.filterItems(items, type, q), [items, type, q])
}

// The per-serial fleet-unit ledger shared by the Devices/Calibration/
// Assignments/Movements tabs — gated on the people list being loaded.
export const useDeviceFleetUnits = () => {
  const { people, isLoading: peopleLoading } = usePeopleData()
  const { data: units = [], isLoading, error } = useQuery({
    queryKey: ['inventory', 'units', people.length],
    queryFn: async () => service.seedUnits(people),
    enabled: !peopleLoading,
  })

  return { units, people, isLoading: peopleLoading || isLoading, error }
}

// Rollup for one catalog device, recomputed from the shared seeded units list.
export const useDeviceFleet = (units: ReturnType<typeof useDeviceFleetUnits>['units'], deviceId: string) => {
  return useMemo(() => service.deviceFleet(units, deviceId), [units, deviceId])
}

// Shares the item-master query key with useItemMaster() so invalidating
// either keeps both in sync; transfers/dietitians are gated on people loading.
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

// Valuation numbers for the Warehouse tab's location cards + stock table.
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
    // items/dietitians/transfers aren't read directly below — they're deps
    // purely so this recomputes after a mutation invalidates them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, items, dietitians, transfers])
}

export const useInventoryOverview = () => {
  const { units, people, isLoading, error } = useDeviceFleetUnits()
  const { consumables } = useConsumables()

  const kpis = useMemo(() => service.buildInventoryKpis(units), [units])
  const aiSummary = useMemo(() => service.buildInventoryAiSummary(units), [units])
  const fleetByType = useMemo(() => service.fleetByDeviceType(), [])
  // consumablesStatusMix()/criticalConsumables() take no args and read
  // getConsumables() internally; `consumables` is kept as a dep so this is
  // ready to recompute once that becomes real invalidation-backed data.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const statusMix = useMemo(() => service.consumablesStatusMix(), [consumables])
  const overdueUnits = useMemo(() => service.overdueUnitsForOverview(units), [units])
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

export const useCalibrationRows = (
  units: ReturnType<typeof useDeviceFleetUnits>['units'],
  people: ReturnType<typeof useDeviceFleetUnits>['people'],
  type: string,
  status: string,
  q: string,
) => {
  return useMemo(() => service.buildCalibrationRows(units, people, type, status, q), [units, people, type, status, q])
}

export const useCalibrationFilters = () => {
  const [type, setType] = useState<string>(INVENTORY_FILTER_DEFAULTS.type)
  const [status, setStatus] = useState<string>(INVENTORY_FILTER_DEFAULTS.status)
  const [q, setQ] = useState<string>(INVENTORY_FILTER_DEFAULTS.q)

  return { type, setType, status, setStatus, q, setQ }
}

// One-click, no-confirmation mutation. Also appends a synthetic CALIB
// movement record, so both the units and movements queries are invalidated.
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

// Feeds the Vendor Detail drawer's trend table — a separate query so it can
// seed independently of the vendor roster query above.
export const useVendorPriceHistory = () => {
  const { data: priceHistory = [], isLoading, error } = useQuery({
    queryKey: ['inventory', 'priceHistory'],
    queryFn: async () => service.getPriceHistory(),
  })

  return { priceHistory, isLoading, error }
}

// The full movements ledger, newest-first — gated on the units list being
// ready since seeding needs a live units[] to filter out orphaned rows.
export const useMovements = () => {
  const { units, people, isLoading: unitsLoading } = useDeviceFleetUnits()
  const { data: movements = [], isLoading: movementsLoading, error } = useQuery({
    queryKey: ['inventory', 'movements', units.length],
    queryFn: async () => service.getMovements(units),
    enabled: !unitsLoading,
  })

  return { movements, units, people, isLoading: unitsLoading || movementsLoading, error }
}

// Shares the same transfers/items query keys as useWarehouse() so both tabs
// stay in sync — invalidating one tab's mutation refreshes the other's view.
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

export const useTransfersRollup = (transfers: ReturnType<typeof useTransfers>['transfers']) => {
  return useMemo(() => service.transfersLogisticsRollup(transfers), [transfers])
}

// No foHoldings() engine exists yet, so this always degrades to the
// `suggestion: null` branch — thread it in as the first argument once it lands.
export const useBalancingSuggestions = (people: ReturnType<typeof useTransfers>['people']) => {
  return useMemo(() => service.balancingSuggestions(undefined, people), [people])
}

// Reachable from the shared page-head "New transfer" button on every tab and
// from the Movements tab's own "+ Log movement" button — the same modal in
// both places, distinct from the Warehouse/Transfers stock-transfer modal.
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

// No foHoldings() engine exists yet, so valuation()'s fieldValue degrades to
// 0 — thread it in as buildDashboardsData's 3rd argument once it lands.
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

export const useDashboardSubView = () => {
  const [sub, setSub] = useState<DashboardSubView>('exec')
  return { sub, setSub }
}

export const useFoInventoryRows = () => {
  const { units, people, isLoading: unitsLoading } = useDeviceFleetUnits()

  const { data: rows = [], isLoading: rowsLoading, error } = useQuery({
    queryKey: ['inventory', 'foinventory', units.length, people.length],
    queryFn: async () => service.buildFoInventoryRows(units, people),
    enabled: !unitsLoading,
  })

  return { rows, units, people, isLoading: unitsLoading || rowsLoading, error }
}

// Reuses the units/people already loaded by useFoInventoryRows() above so
// opening the drawer needs no extra query.
export const useFoHoldings = (
  foId: string | null,
  units: ReturnType<typeof useDeviceFleetUnits>['units'],
  people: ReturnType<typeof useDeviceFleetUnits>['people'],
) => {
  return useMemo(() => (foId ? service.foHoldings(foId, units, people) : null), [foId, units, people])
}

// The real persisted PR → PO → GRN pipeline. Shares its query keys with the
// Dashboards tab, so every mutation here invalidates both.
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

export type ProcurementSeg = 'PR' | 'PO' | 'GRN'
export const useProcurementSeg = () => {
  const [seg, setSeg] = useState<ProcurementSeg>('PR')
  return { seg, setSeg }
}

export const useForecastWindow = () => {
  const [win, setWin] = useState(30)
  return { win, setWin }
}

export const useDemandForecast = (win: number) => {
  return useMemo(() => service.forecast(win), [win])
}

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
  // are recomputed via useMemo after each mutation invalidates this key set.
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

export const useHolders = (people: ReturnType<typeof useDeviceFleetUnits>['people']) => {
  return useMemo(() => service.holders(people), [people])
}

export const useHolderHoldings = (holder: string, refreshKey: unknown) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => service.holderHoldings(holder), [holder, refreshKey])
}

export const useFieldOpsSegment = () => {
  const [seg, setSeg] = useState<FieldOpsSegment>('refills')
  return { seg, setSeg }
}

export const useFieldOpsHolder = () => {
  const [holder, setHolder] = useState<string>('')
  return { holder, setHolder }
}

// Merges the units/people-derived Movements/Refills/Field-reports stores with
// the Transfers/PR/PO/GRN stores into one flat ledger.
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

export const useAuditFilter = () => {
  const [type, setType] = useState<string>('ALL')
  return { type, setType }
}

export const useCopilotData = () => {
  const { units, people, isLoading: unitsLoading } = useDeviceFleetUnits()

  const { data, isLoading: dataLoading, error } = useQuery({
    queryKey: ['inventory', 'copilot', units.length, people.length],
    queryFn: async () => service.buildCopilotData(units, people),
    enabled: !unitsLoading,
  })

  return { data, isLoading: unitsLoading || dataLoading, error }
}
