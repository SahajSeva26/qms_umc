// Inventory & Devices domain types — exact port of the prototype's
// s:\QMS-Camp-Portal-feature-qms-sales-ops-suite\assets\js\inventory.js
// (main module: Overview/Dashboards/Devices/Calibration/Transfers/
// Assignments/Forecast/Copilot/Audit/Movements) plus the sibling
// inventory-masters.js / inventory-procurement.js / inventory-warehouse.js /
// inventory-field.js / inventory-intel.js files that make up the rest of the
// screen. This is a build-from-scratch mock/frontend-only feature — no real
// backend module exists yet (confirmed against backend/src/modules/), same
// pattern as features/reminders and features/hq.
//
// NOTE ON DATA SOURCES: the Consumables tab (inventory.js's tabConsumables())
// reads a totally different mock catalog — consumables() = window.QMS_MASTER
// .consumables || window.QMS_ADMIN.CONSUMABLES — than the Field
// Ops/Procurement/Masters tabs, which read qms.inventory.items +
// qms.inventory.allocations from localStorage. Do NOT conflate the two
// "consumable stock" concepts when adding to this file for other tabs later.

// ── Consumables catalog (window.QMS_ADMIN.CONSUMABLES, admin-data.js) ──────

export type ConsumableCategory = 'COMMON' | 'PROJECT'

export interface Consumable {
  id: string
  sku: string
  name: string
  category: ConsumableCategory
  uom: string
  pricePerUnit: number
  reorderLevel: number
  stock: number
  leadTimeDays: number
  vendor: string
  deviceIds: string[]
  qtyPerPatient: number
}

// consumableStatus() codes — CRIT/LOW/HEALTH only (OK/SOON/OVER belong to the
// Calibration tab's own status vocabulary, not Consumables).
export type ConsumableStatusCode = 'CRIT' | 'LOW' | 'HEALTH'

export interface ConsumableStatus {
  code: ConsumableStatusCode
  label: string
  /** Only set on the HEALTH branch — Math.round(ratio * 30), a crude
   * "reorderLevel ≈ 30 days of supply" heuristic. LOW/CRIT rows never carry
   * a daysCover number. */
  daysCover?: number
}

// ── Device catalog (window.QMS_ADMIN.DEVICE_CATALOG, admin-data.js) ────────
// Full shape — the Consumables tab's cross-tab type filter only reads
// devices().type, but Item Master's seed() (inventory-masters.js:99-119)
// needs the rest (pricePerUnit for the AMC>20000 threshold + currentValue
// heuristic, calibIntervalDays, usedForTests for the Device→Test mapping).
// Extended additively — do not narrow existing fields.
export interface DeviceCatalogItem {
  id: string
  name: string
  model: string
  vendor: string
  type: string
  pricePerUnit: number
  paramCount: number
  calibIntervalDays: number
  unitsAvailable: number
  unitsDeployed: number
  // Optional — only the Devices tab's detail drawer / Item Master's
  // Device→Test mapping read these; the mock catalog rows used by
  // Overview/Consumables don't need to populate them.
  usedForTests?: string[]
  laymanDescription?: string
  faq?: string
  userManualUrl?: string
  videoUrl?: string
}

// ── Tests catalog (window.QMS_ADMIN.TESTS, admin-data.js) — Item Master's
// Device→Test mapping only needs id+name (testName() lookup), not the full
// TESTS schema (params/interpretation/etc. belong to a future Camp/Test
// module, out of scope here). ──────────────────────────────────────────────
export interface TestCatalogItem {
  id: string
  code: string
  name: string
}

// Shared filter state shape — mirrors the prototype's module-level mutable
// `state.filter` object (type/status/q) reused across Devices/Calibration/
// Consumables tabs. In the React port each tab owns its own local state
// slice instead of a global mutable object, but the FIELD NAMES are kept
// consistent with the prototype for readability when cross-referencing.
export interface InventoryFilterState {
  type: string
  status: string
  q: string
}

export const INVENTORY_FILTER_DEFAULTS: InventoryFilterState = {
  type: 'ALL',
  status: 'ALL',
  q: '',
}

// ── Fleet units (window.QMS_MASTER units store, qms.inventory.units) ───────
// One row per physical device serial, synthesized from DEVICE_CATALOG's
// unitsAvailable+unitsDeployed counts by seedUnits() — exact port of
// inventory.js's per-unit record shape (lines 190-198). `id` is
// `<deviceId>:<serial>` — the Movements tab strips the deviceId prefix back
// off for display via unitId.split(':')[1].
export interface InventoryUnit {
  id: string
  sn: string
  deviceId: string
  deviceType: string
  status: 'ACTIVE' | 'RETIRED'
  lastCalibrated: string
  nextCalibration: string
  /** FO person id this unit is deployed to, or '' if unassigned. */
  assignedTo: string
  /** Hub/warehouse name when not deployed to an FO, else null. */
  location: string | null
  qrCode: string
}

// Fixed pool of hub/warehouse names seedUnits() distributes non-deployed
// units across — exact port of inventory.js's `hubs` array (line 188).
export const INVENTORY_HUBS = ['Mumbai HQ', 'Pune Hub', 'Bangalore Hub', 'Hyderabad Hub', 'Delhi Hub', 'Kolkata Hub']

// ── Movements ledger (qms.inventory.movements) ──────────────────────────────

export type MovementType = 'HANDOVER' | 'RETURN' | 'TRANSFER' | 'CALIB' | 'PROCURE' | 'RETIRE'

export interface Movement {
  id: string
  date: string
  type: MovementType | string
  unitId: string
  deviceType: string
  from: string
  to: string
  notes: string
  by: string
}

export interface MovementTypeMeta {
  label: string
  color: string
  icon: string
}

// typeMeta map — exact port of tabMovements()'s inline typeMeta object
// (inventory.js:752-759). Any unrecognized type falls back to
// {label: rawType, color: '#94a3b8', icon: 'circle'} at render time.
export const MOVEMENT_TYPE_META: Record<MovementType, MovementTypeMeta> = {
  HANDOVER: { label: 'Handover', color: '#3b6dff', icon: 'send' },
  RETURN: { label: 'Return', color: '#10b981', icon: 'corner-down-left' },
  TRANSFER: { label: 'Transfer', color: '#8b5cf6', icon: 'arrow-right-left' },
  CALIB: { label: 'Calibration', color: '#f59e0b', icon: 'wrench' },
  PROCURE: { label: 'Procurement', color: '#14b8a6', icon: 'shopping-cart' },
  RETIRE: { label: 'Retire', color: '#f43f5e', icon: 'archive-x' },
}

export function movementTypeMeta(type: string): MovementTypeMeta {
  return MOVEMENT_TYPE_META[type as MovementType] ?? { label: type, color: '#94a3b8', icon: 'circle' }
}

// Options for the "Log movement" modal's Type select — exact order/copy of
// invNewMovement()'s <select id="mv-type"> (inventory.js:804-811).
export const MOVEMENT_TYPE_OPTIONS: { value: MovementType; label: string }[] = [
  { value: 'HANDOVER', label: 'Handover (Hub → FO)' },
  { value: 'RETURN', label: 'Return (FO → Hub)' },
  { value: 'TRANSFER', label: 'Transfer (Hub → Hub)' },
  { value: 'CALIB', label: 'Send for calibration' },
  { value: 'PROCURE', label: 'Procurement (Vendor → Hub)' },
  { value: 'RETIRE', label: 'Retire unit' },
]

// ── Item Master unified registry (window.QMS_InvMasters, inventory-masters.js) ──
// A SEPARATE data model from the Consumable/DeviceCatalogItem catalogs above —
// this is the unified `qms.inventory.items` store that backs the Item Master
// and Expiry/FEFO tabs specifically (6 mandatory item types, one record shape
// carrying either asset fields OR batch/expiry fields depending on itemType).
// Do NOT conflate with Consumable/DeviceCatalogItem — those feed the separate
// Consumables/Devices tabs in the main inventory.js module.

// Mandatory first dropdown on create — exact order from inventory-masters.js's TYPES.
export const ITEM_TYPES = [
  'Device', 'Consumable', 'General Consumable', 'Marketing Material', 'IT Asset', 'Office Asset',
] as const
export type ItemType = (typeof ITEM_TYPES)[number]

export interface ItemTypeMeta {
  icon: string
  color: string
}

// Exact port of inventory-masters.js's TYPE_META.
export const ITEM_TYPE_META: Record<ItemType, ItemTypeMeta> = {
  'Device':             { icon: 'cpu',       color: '#3b6dff' },
  'Consumable':         { icon: 'package',   color: '#14b8a6' },
  'General Consumable': { icon: 'box',       color: '#10b981' },
  'Marketing Material': { icon: 'megaphone', color: '#f59e0b' },
  'IT Asset':           { icon: 'laptop',    color: '#8b5cf6' },
  'Office Asset':       { icon: 'armchair',  color: '#ec4899' },
}

// Carry warranty / AMC / depreciation fields.
export const ASSET_TYPES: ItemType[] = ['Device', 'IT Asset', 'Office Asset']
// Carry batch / expiry fields.
export const CONSUMABLE_TYPES: ItemType[] = ['Consumable', 'General Consumable', 'Marketing Material']

export function isAssetType(t: ItemType | string): boolean {
  return (ASSET_TYPES as string[]).includes(t)
}
export function isConsumableType(t: ItemType | string): boolean {
  return (CONSUMABLE_TYPES as string[]).includes(t)
}

export type AssetStatus = 'Available' | 'Allocated' | 'Under Repair' | 'Lost' | 'Damaged' | 'Scrapped'
export const ASSET_STATUSES: AssetStatus[] = ['Available', 'Allocated', 'Under Repair', 'Lost', 'Damaged', 'Scrapped']

export type DepreciationMethod = 'Straight Line' | 'Written Down Value' | 'None'
export const DEPRECIATION_METHODS: DepreciationMethod[] = ['Straight Line', 'Written Down Value', 'None']

// One unified record — exact field superset of inventory-masters.js's item
// rows (asset-only and consumable-only fields are both optional since a given
// record only ever populates the branch matching its own itemType). Only
// id/itemType/name/status are true invariants across every item — the rest
// (sourceId/code/category/vendor/gst/purchaseCost included) are optional so
// both asset-only and consumable-only rows type-check identically.
export interface InventoryItem {
  id: string
  sourceId?: string
  itemType: ItemType
  name: string
  code?: string
  category?: string
  vendor?: string
  gst?: number | null
  purchaseCost?: number | null
  status: 'ACTIVE' | 'INACTIVE' | string

  // Asset-only (Device / IT Asset / Office Asset)
  manufacturer?: string
  model?: string
  serialNo?: string
  qrCode?: string
  barcode?: string
  purchaseDate?: string
  invoiceNo?: string
  warrantyYears?: number | null
  warrantyEnd?: string
  amcApplicable?: boolean
  amcCost?: number | null
  amcStart?: string
  amcEnd?: string
  calibApplicable?: boolean
  calibFreqDays?: number | null
  calibDue?: string
  usefulLifeYears?: number | null
  deprMethod?: DepreciationMethod
  deprPct?: number | null
  currentValue?: number | null
  assetStatus?: AssetStatus
  usedForTests?: string[]

  // Consumable-only (Consumable / General Consumable / Marketing Material)
  uom?: string
  qtyOnHand?: number | null
  reorderLevel?: number | null
  batchNo?: string
  mfgDate?: string
  expiryDate?: string
  storage?: string
  linkedDeviceId?: string
}

// Expiry band vocabulary — Green > 180 · Yellow 90-180 · Orange 30-90 · Red < 30 · Expired.
export type ExpiryBandCode = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'EXPIRED'
// CSS suffix used by the .im-band pill classes (green/yellow/orange/red share
// their own name; EXPIRED also renders with the "red" pill class).
export type ExpiryBandCss = 'green' | 'yellow' | 'orange' | 'red'

export interface ExpiryBand {
  code: ExpiryBandCode
  label: string
  days: number
  css: ExpiryBandCss
}

// ── FO holdings engine (foHoldings(), inventory-masters.js:616-665) —────────
// single source of truth shared by the FO Inventory tab AND the Field Ops →
// Allocations sub-tab (both read the same qms.inventory.allocations ledger).

export interface FoDeviceHolding {
  sn: string
  deviceId: string
  name: string
  model: string
  type: string
  current: number
  replace: number
  calibDue: string
}

export interface FoConsumableHolding {
  item: InventoryItem
  qty: number
  value: number
  band: ExpiryBand | null
}

export interface FoHoldings {
  devices: FoDeviceHolding[]
  consumables: FoConsumableHolding[]
  deviceCurrent: number
  deviceReplace: number
  consumableValue: number
  totalValue: number
  expSoon: number
}

// ── Allocation ledger row (qms.inventory.allocations, inventory-field.js) ──
// Holder codes are 'FO:<personId>' or 'DIET:<dietitianId>' — only FO:* is
// consumed by this tab; DIET:* rows exist for the (separately-built) Field
// Ops tab's holder switcher and are simply ignored here.
export interface AllocationRow {
  holder: string
  itemId: string
  qty: number
  batchNo?: string
  expiryDate?: string
  updatedOn: string
}

// ── Fleet units (qms.inventory.units, seedUnits() in inventory.js:165-219) ──
// Reuses the canonical `InventoryUnit` declared above.

// calibStatus() codes — OVER (days < 0) / SOON (0 <= days < 14) / OK (else).
// Exact port of inventory.js:240-245.
export type CalibStatusCode = 'OVER' | 'SOON' | 'OK'

export interface CalibStatus {
  code: CalibStatusCode
  label: string
  days: number
}

// deviceFleet() per-device rollup — exact port of inventory.js:247-257.
export interface DeviceFleet {
  total: number
  deployed: number
  available: number
  overdue: number
  soon: number
  units: InventoryUnit[]
}

// ── Movements ledger (qms.inventory.movements, inventory.js:221-235) ───────
// Reuses the canonical `MovementType`/`Movement` declared above.

// ── Warehouse/Transfers item master (qms.inventory.items, localStorage) ────
// NOTE: this is a SEPARATE mock data model from the Consumable/DeviceCatalog
// catalogs above — exact port of inventory-masters.js's unified item store
// (window.QMS_InvMasters), which the Warehouse/Transfers/Procurement/Field
// Ops tabs all read/write via qms.inventory.items + qms.inventory.transfers
// + qms.inventory.allocations. Do NOT conflate the two "consumable stock"
// concepts — inventory.js's tabConsumables() and this item-master store are
// independent mock datasets in the prototype itself.

// Unified item-master record — one shape for all 6 item types (a given
// record only populates the fields relevant to its own itemType). Only the
// fields the Transfers tab's own logic actually reads are declared here in
// full; other tabs may extend this additively later.
export interface InventoryMasterItem {
  id: string
  sourceId?: string
  itemType: ItemType
  name: string
  code: string
  category?: string
  vendor?: string
  uom?: string
  qtyOnHand?: number
  reorderLevel?: number
  batchNo?: string
  mfgDate?: string
  expiryDate?: string
  storage?: string
  linkedDeviceId?: string
  purchaseCost?: number
  gst?: number
  status?: 'ACTIVE' | 'INACTIVE'
}

// ============================================================ Warehouse / network locations

export const CENTRAL = 'CENTRAL'
export const CENTRAL_LABEL = 'Central WH · HO'

export interface LocOption {
  code: string
  label: string
}

export interface DietitianRef {
  id: string
  name: string
  hq: string
}

// dietHoldings() result — inventory-warehouse.js:63-70. `value` is the
// dietitian's derived/ledger stock value in ₹ (used by dietFieldValue() and
// the Warehouse tab's "Dietitian stock" location card).
export interface DietConsumableHolding {
  item: InventoryItem
  qty: number
  value: number
}

export interface DietHoldings {
  consumables: DietConsumableHolding[]
  value: number
}

// The 4 Warehouse tab location cards (.wh-loc-card) — exact code scheme from
// inventory-warehouse.js's card() helper (CENTRAL/FO/DIET/TRANSIT).
export type WarehouseLocCode = 'CENTRAL' | 'FO' | 'DIET' | 'TRANSIT'

// ============================================================ Transfers

export type TransferStatus = 'REQUESTED' | 'IN_TRANSIT' | 'DELIVERED'

export interface TransferPod {
  ref: string
  by: string
  at: string
  photo?: string
}

// One row per stock transfer — exact port of inventory-warehouse.js's
// transfers() store shape (qms.inventory.transfers).
export interface Transfer {
  id: string
  date: string
  from: string
  to: string
  itemId: string
  itemName: string
  qty: number
  uom: string
  courier: number
  freight: number
  packaging: number
  handling: number
  logistics: number
  status: TransferStatus
  pod: TransferPod | null
  notes: string
}

// New-transfer preset used to prefill the modal from the Emergency
// Balancing panel's "Transfer" button (balanceTransfer()).
export interface TransferPreset {
  itemId?: string
  from?: string
  to?: string
  qty?: number
}

// Emergency stock-balancing suggestion row — exact port of
// balancingSuggestions()'s return shape.
export interface BalancingSuggestion {
  item: InventoryMasterItem
  need: number
  suggestion: { loc: string; qty: number } | null
}

// ── Field Ops (inventory-field.js, window.QMS_InvField) ────────────────────
// A separate data domain from the Consumables catalog above: Field Ops reads
// qms.inventory.items + qms.inventory.allocations (a real per-holder ledger),
// NOT window.QMS_ADMIN.CONSUMABLES. Do not conflate the two when reading this
// file — see the NOTE ON DATA SOURCES comment at the top of this file.

// Items master (inventory-masters.js's items()/qms.inventory.items) — the
// warehouse-side item catalog that Field Ops' refills/reports/allocations all
// key off of via itemId. Reuses the canonical `InventoryItem`/`ItemType`
// declared above (same unified qms.inventory.items store) — Field Ops only
// reads a subset of its fields.

// A "holder" is any Field Officer or Dietitian who can carry field stock,
// plus the synthetic 'CENTRAL' warehouse code. code is 'FO:{personId}' |
// 'DIET:{personId}' — holders() concatenates allFos() + dietitians(), exact
// port. In this React port both FO and Dietitian live in the same Person[]
// (usePeopleData), unlike the prototype's separate dietitians() store.
export type HolderKind = 'FO' | 'Dietitian'

export interface Holder {
  code: string
  name: string
  kind: HolderKind
  hq: string
}

export const CENTRAL_HOLDER = 'CENTRAL'

// Allocation ledger row — reuses the canonical `AllocationRow` declared above
// (same qms.inventory.allocations ledger, adjustAllocation() is the CORE
// mutator both Field Ops and the FO Inventory tab share).

export type RefillStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'DISPATCHED'

export interface RefillRequest {
  id: string
  date: string
  holder: string
  itemId: string
  itemName: string
  uom: string
  qty: number
  reason?: string
  status: RefillStatus
}

// LOCAL_PROCURE is reachable only via the Local Procurement modal — it is
// deliberately excluded from ISSUE_TYPES (the Report Stock Event type <select>).
export type IssueType = 'CONSUMPTION' | 'WASTAGE' | 'DAMAGE' | 'LOSS' | 'EXPIRY' | 'RETURN' | 'LOCAL_PROCURE'

export const ISSUE_TYPES: IssueType[] = ['CONSUMPTION', 'WASTAGE', 'DAMAGE', 'LOSS', 'EXPIRY', 'RETURN']

export interface FieldReport {
  id: string
  date: string
  holder: string
  itemId: string
  itemName: string
  uom: string
  qty: number
  type: IssueType
  reason?: string
  status: 'REPORTED'
  // Present ONLY on LOCAL_PROCURE report rows — not part of the base schema,
  // exact port of saveLocalProcure() attaching rep.cost/rep.invoiceNo directly.
  cost?: number
  invoiceNo?: string
}

// Reuses the canonical `ExpiryBand`/`ExpiryBandCode`/`ExpiryBandCss` declared
// above (expiryBand() is one shared helper across masters.js/field.js).

export interface HolderConsumable {
  item: InventoryItem
  qty: number
  value: number
  band: ExpiryBand | null
}

export interface HolderHoldings {
  consumables: HolderConsumable[]
  value: number
}

export type FieldOpsSegment = 'refills' | 'issues' | 'alloc'

// ── Item Master (qms.inventory.items, inventory-masters.js) ────────────────
// Procurement reuses the canonical `ItemType`/`InventoryItem` declared
// above (same unified item store every tab reads/writes).

// ── Vendors + Procurement (inventory-procurement.js, window.QMS_InvProc) ───
// Shared module: seed() seeds vendors + priceHistory + PRs + POs + GRNs
// together (one seed, both the Vendors and Procurement tabs read it) — the
// React port's service layer preserves that as ONE initializer so the
// once-only seed guard behaves identically to the prototype's `_v` version
// guard, not two independent seed calls.

export interface Vendor {
  id: string
  name: string
  gst: string
  pan: string
  city: string
  state: string
  contact: string
  email: string
  phone: string
  category: string
  status: 'ACTIVE' | 'INACTIVE'
  priceListNote: string
  deliveryScore: number
  qualityScore: number
  complaintRate: string
  costScore: number
}

export interface PriceHistoryRow {
  itemId: string
  itemName: string
  vendor: string
  date: string
  unitCost: number
  gst: number
  freight: number
  landed: number
}

// 4-stage sequential PR approval chain — exact port of PR_CHAIN.
export const PR_CHAIN = ['Requester', 'Ops Manager', 'Procurement', 'Finance'] as const
export type PrStage = (typeof PR_CHAIN)[number]

export const PR_SOURCES = ['Manual', 'Auto Reorder', 'Camp Forecast'] as const
export type PrSource = (typeof PR_SOURCES)[number]

export const PAY_TERMS = ['Advance', 'Net 15', 'Net 30', 'Net 45'] as const
export type PayTerm = (typeof PAY_TERMS)[number]

export interface PrHistoryEntry {
  stage: string
  action: 'approved'
  by: string
  at: string
}

// pr.status: PENDING while moving through PR_CHAIN; APPROVED once past
// Finance; REJECTED if rejected at any stage (final); PO_CREATED once
// prToPO() has converted it (also final, distinct from APPROVED — the row's
// status pill then falls through to the generic PENDING-look pill showing
// pr.stage's literal text "PO created").
export type PrStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PO_CREATED'

export interface PurchaseRequisition {
  id: string
  date: string
  source: PrSource | string
  itemId: string
  itemName: string
  uom: string
  qty: number
  reason: string
  requester: string
  /** Current stage name — one of PR_CHAIN while PENDING, else 'Approved' /
   * 'PO created' as a terminal display label. */
  stage: string
  status: PrStatus
  history: PrHistoryEntry[]
}

// po.status — AWAITING (needs Ops Manager approval) → OPEN (approved,
// awaiting receipt) → CLOSED (received, terminal) | CANCELLED (rejected,
// terminal) | DELAYED (seed-only demo variant of OPEN, same action set).
export type PoStatus = 'AWAITING' | 'OPEN' | 'PENDING' | 'DELAYED' | 'CLOSED' | 'CANCELLED'

export interface PurchaseOrder {
  id: string
  date: string
  prId: string
  vendorId: string
  vendorName: string
  itemId: string
  itemName: string
  qty: number
  uom: string
  unitRate: number
  gst: number
  freight: number
  paymentTerms: PayTerm | string
  deliveryDays: number
  expectedDate: string
  status: PoStatus
  createdBy: string
  approvedBy: string
  approvedAt?: string
}

export interface GoodsReceiptNote {
  id: string
  date: string
  poId: string
  vendorName: string
  itemId: string
  itemName: string
  receivedQty: number
  acceptedQty: number
  rejectedQty: number
  batchNo: string
  expiryDate: string
  invoiceNo: string
  notes: string
}

// ── Overview tab (tabOverview()/renderKpis()/renderAi(), inventory.js
// lines 321-520) ────────────────────────────────────────────────────────────

export type KpiTone = 'brand' | 'teal' | 'emerald' | 'amber' | 'rose' | 'violet'

// One of the 8 shared KPI tiles rendered by renderKpis() into #inv-kpis —
// shared across every tab (not Overview-specific data), each drills into a
// destination tab via `tab` on click (window.invSetTab in the prototype).
export interface InventoryKpiCard {
  label: string
  tone: KpiTone
  icon: string
  value: string | number
  sub: string
  tab: string
}

// Fleet-by-device-type bar row — tabOverview()'s fleetByType map
// (inventory.js:421-429). `label` (device type's first word) is computed by
// the prototype but never actually rendered — the render loop prints `full`
// for both the title attribute and the visible text, so `label` is kept here
// only for parity/reference; the React port's JSX uses `full` for both.
export interface FleetByTypeRow {
  label: string
  full: string
  value: number
  color: string
}

// Consumables status-mix tally — tabOverview()'s statusMix (inventory.js:432-433).
export interface ConsumableStatusMix {
  HEALTH: number
  LOW: number
  CRIT: number
}

// ── Dashboards tab (window.QMS_InvIntel.tabDashboards(), inventory-intel.js
// lines 175-269) — 8 sub-views (Executive/Inventory/Procurement/Finance/
// Vendor/Logistics/Camp Readiness/Operations), each its own kpiGrid() +
// supporting table. A SEPARATE synthesis layer over items/transfers/
// refills/reports/pos/prs/grns/vendors/priceHist/movements + the camps
// master — computed live, nothing persisted by this tab itself. ───────────

export type DashboardSubView = 'exec' | 'inventory' | 'procurement' | 'finance' | 'vendor' | 'logistics' | 'readiness' | 'operations'

export interface DashboardSegMeta {
  id: DashboardSubView
  label: string
  icon: string
}

// segs array — exact order/copy from tabDashboards() (inventory-intel.js:177).
export const DASHBOARD_SEGS: DashboardSegMeta[] = [
  { id: 'exec', label: 'Executive', icon: 'gauge' },
  { id: 'inventory', label: 'Inventory', icon: 'package' },
  { id: 'procurement', label: 'Procurement', icon: 'shopping-cart' },
  { id: 'finance', label: 'Finance', icon: 'receipt-indian-rupee' },
  { id: 'vendor', label: 'Vendor', icon: 'contact' },
  { id: 'logistics', label: 'Logistics', icon: 'truck' },
  { id: 'readiness', label: 'Camp Readiness', icon: 'list-checks' },
  { id: 'operations', label: 'Operations', icon: 'activity' },
]

// Same shared kpiGrid()/.kpi tile shape as InventoryKpiCard, but `tab` is
// genuinely optional here — several Dashboards tiles (Executive's "Avg
// readiness", every Finance tile, Vendor's "Avg scorecard") render with NO
// tab/no click-through, exact port of kpiGrid()'s `${k.tab ? 'clickable' :
// ''}` conditional (inventory-intel.js:161).
export interface DashboardKpiCard {
  label: string
  tone: KpiTone
  icon: string
  value: string | number
  sub: string
  tab?: string
}

// valuation() — exact port (inventory-intel.js:105-121).
export interface InventoryValuation {
  inventoryValue: number
  fieldValue: number
  assetValue: number
  assetPurchase: number
  expiredValue: number
  damagedValue: number
  amcCost: number
  depreciated: number
}

// logisticsRollup() — exact port (inventory-intel.js:123-129).
export interface LogisticsRollup {
  total: number
  perTransfer: number
  perCamp: number
  perPatient: number
  inTransit: number
}

// forecast(windowDays) row — exact port (inventory-intel.js:70-79).
export interface ForecastRow {
  it: InventoryItem
  required: number
  available: number
  shortage: number
  procure: number
  camps: number
}

// campReadiness(c) — exact port (inventory-intel.js:92-103).
export type ReadinessBand = 'green' | 'amber' | 'red'

export interface CampReadinessScore {
  score: number
  band: ReadinessBand
  manpower: number
  devices: number
  consumables: number
  logistics: number
  approvals: number
}

export interface RankedVendor {
  v: Vendor
  sc: number
}

export interface PriceAlert {
  name: string
  vendor: string
  chg: number
}

// ── Audit tab (window.QMS_InvIntel.tabAudit(), inventory-intel.js lines
// 449-470) — a flat, unified chronological ledger merged from SEVEN separate
// underlying stores (Movements/Transfers/Refills/Field reports/Goods
// receipts/Requisitions/Purchase orders). Exact port of the `ev.push(...)`
// normalized record shape — one flat {date, type, ref, who, detail} tuple per
// source row, string-sorted newest-first, no drill-through of its own. ──────

// The exactly-7 possible `type` label strings tabAudit() ever produces —
// `types` (the filter <select>'s options) is `['ALL', ...whichever of these
// actually occur in the current data]`, so not every label is guaranteed to
// appear as a filter option at any given moment.
export type AuditEventType =
  | 'Movement' | 'Transfer' | 'Refill' | 'Field report' | 'Goods receipt' | 'Requisition' | 'Purchase order'

export interface AuditEvent {
  /** Raw date string straight off the source record — printed as-is, no
   * parsing/reformatting (relies on every source date being ISO
   * 'YYYY-MM-DD' for the string-sort below to land in true chronological
   * order). */
  date: string
  type: AuditEventType
  /** Source record's own id/reference code (transfer id, PO id, PR id, …). */
  ref: string
  /** Human-or-system actor label — several source types HARD-CODE a fixed
   * literal here (Transfer→'Logistics', Refill/Field report→'Field',
   * Goods receipt→'Stores') rather than deriving it from real per-record
   * actor data; only Movement/Requisition/Purchase order fall back to a
   * per-record field with a literal-string default. */
  who: string
  /** Free-text one-line summary assembled per source type — plain text, not
   * a structured sub-object. */
  detail: string
}
