// Compatibility barrel — Phase 3 service breakup split this file's ~3,540
// lines into 9 domain services under ./services/ (Field Ops was carved out
// of Movement as its own domain — see fieldops.service.ts). Every symbol this file
// used to export is re-exported here verbatim (same name, same shape, same
// behavior) so existing imports (`@/features/inventory/inventory.service`)
// keep working with zero component changes. Do not add new logic here — add
// it to the owning domain service and re-export it below.

// ── Item CRUD, Vendors, Warehouse/network locations, mock catalogs ─────────
export {
  getConsumables,
  getDeviceCatalog,
  getTests,
  testName,
  consumableStatus,
  inr,
  raisePO,
  getItems,
  saveAllItems,
  itemById,
  inrShort,
  expiryBand,
  remainingLabel,
  itemValue,
  filterItems,
  saveItem,
  consumableItems,
  allFos,
  getDietitians,
  dietHoldings,
  locOptions,
  locLabel,
  centralValue,
  foFieldValue,
  dietFieldValue,
  transitValue,
  getVendors,
  vendorById,
  vendorByName,
  getPriceHistory,
  vendorPriceTrend,
  vendorOverallScore,
  vendorTone,
  saveVendor,
} from './services/inventory.service'
export type {
  ItemFormValues,
  VendorPriceTrendRow,
  VendorFormValues,
} from './services/inventory.service'

// ── Fleet units + Calibration ───────────────────────────────────────────────
export {
  seedUnits,
  calibStatus,
  deviceFleet,
  buildCalibrationRows,
  markCalibrated,
} from './services/fleet.service'
export type {
  EnrichedCalibRow,
} from './services/fleet.service'

// ── Movement logs, Transfers ────────────────────────────────────────────────
export {
  seedMovementsIfEmpty,
  getMovements,
  logMovement,
  primeTransfersSeed,
  getTransfers,
  saveTransfer,
  transfersLogisticsRollup,
  balancingSuggestions,
  dispatchTransfer,
  saveDeliver,
  nextPodRef,
} from './services/movement.service'
export type {
  LogMovementInput,
  NewTransferInput,
  DeliverPodInput,
} from './services/movement.service'

// ── Field Ops (allocation ledger, refills, field reports), FO Inventory ────
export {
  holders,
  holderName,
  holderKind,
  adjustAllocation,
  holderHoldings,
  seedFieldOps,
  getRefills,
  getFieldReports,
  approveRefill,
  rejectRefill,
  dispatchRefill,
  saveRefill,
  saveReport,
  saveLocalProcure,
  foDeviceHoldings,
  foDeviceIds,
  foConsumableHoldings,
  foHoldings,
  buildFoInventoryRows,
} from './services/fieldops.service'
export type {
  NewRefillInput,
  NewReportInput,
  NewLocalProcureInput,
  FoInventoryTabRow,
} from './services/fieldops.service'

// ── Procurement (PR → PO → GRN) ──────────────────────────────────────────────
export {
  poTotal,
  getPrs,
  getPos,
  getGrns,
  savePR,
  advancePR,
  autoReorder,
  prToPO,
  poFlow,
  savePOCreate,
  approvePO,
  rejectPO,
  saveGRN,
} from './services/procurement.service'
export type {
  PrFormValues,
  PoFlowStep,
  PoCreateFormValues,
  GrnFormValues,
  GrnDefaults,
  GrnOpenResult,
  SaveGrnResult,
} from './services/procurement.service'

// ── Forecast, Camp readiness, Camp Consumption Engine ───────────────────────
export {
  upcomingCamps,
  campConsumptionLines,
  campReadiness,
  forecast,
  consumedCamps,
  consumptionCamps,
  totalProcureCost,
  applyConsumption,
  runAutoReorder,
} from './services/forecasting.service'
export type {
  CampConsumptionLine,
} from './services/forecasting.service'

// ── Overview/Dashboards KPIs, valuation, logistics rollup ───────────────────
export {
  buildInventoryKpis,
  buildInventoryAiSummary,
  fleetByDeviceType,
  consumablesStatusMix,
  overdueUnitsForOverview,
  criticalConsumables,
  assetItems,
  valuation,
  logisticsRollup,
  priceAlerts,
  calibDue,
  rankedVendors,
  buildDashboardsData,
  buildDashboardKpis,
} from './services/dashboard.service'
export type {
  DashboardsData,
} from './services/dashboard.service'

// ── AI Copilot ───────────────────────────────────────────────────────────────
export {
  cheapestVendor,
  copilotBalancingSuggestions,
  idleAssets,
  buildCopilotData,
} from './services/ai.service'
export type {
  CheapestVendorResult,
  CopilotBalancingSuggestion,
  IdleAssetRow,
  CopilotData,
} from './services/ai.service'

// ── Audit ────────────────────────────────────────────────────────────────────
export {
  buildAuditEvents,
  auditEventTypes,
  filterAuditEvents,
  auditDisplayRows,
} from './services/audit.service'
