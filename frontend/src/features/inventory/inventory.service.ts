// Inventory & Devices — mock data + pure engine functions, exact port of the
// prototype's inventory.js (window.QMS_MASTER.consumables / window.QMS_ADMIN
// .CONSUMABLES catalog + window.QMS_ADMIN.DEVICE_CATALOG) and admin-data.js's
// CONSUMABLES / DEVICE_CATALOG literals. Entirely mock/frontend-only — no
// backend module exists yet, same as features/reminders and features/hq.

import type { Person } from '@/types/people.types'
import { CAMPS } from '@/features/camps/camps.mock'
import type {
  Consumable, ConsumableStatus, DeviceCatalogItem, TestCatalogItem,
  InventoryItem, ItemType, ExpiryBand,
  InventoryUnit, CalibStatus, DeviceFleet, Movement,
  InventoryKpiCard, FleetByTypeRow, ConsumableStatusMix,
  DietitianRef, DietHoldings, Transfer, TransferPod, TransferPreset, LocOption,
  FoHoldings, FoDeviceHolding, FoConsumableHolding, Vendor, PriceHistoryRow, BalancingSuggestion, InventoryMasterItem,
  PurchaseRequisition, PurchaseOrder, GoodsReceiptNote, RefillRequest, FieldReport,
  InventoryValuation, LogisticsRollup, ForecastRow, CampReadinessScore, ReadinessBand,
  RankedVendor, PriceAlert, DashboardKpiCard, DashboardSubView,
  Holder, AllocationRow, HolderHoldings, IssueType,
  PrStage, PoStatus, AuditEvent,
} from '@/features/inventory/inventory.types'
import { isAssetType, isConsumableType, INVENTORY_HUBS, CENTRAL, CENTRAL_LABEL, PR_CHAIN } from '@/features/inventory/inventory.types'

// ── Mock catalogs — verbatim transcription of admin-data.js's CONSUMABLES
// (lines 604-624) and DEVICE_CATALOG (lines 513+). ──────────────────────────

const CONSUMABLES: Consumable[] = [
  // Common (used across all camps regardless of test)
  { id: 'cns-glove', sku: 'GLV-NTR-M', name: 'Nitrile Gloves (M, pack 100)', category: 'COMMON', uom: 'box', pricePerUnit: 240, reorderLevel: 80, stock: 188, leadTimeDays: 4, vendor: 'Generic', deviceIds: [], qtyPerPatient: 0.5 },
  { id: 'cns-handrub', sku: 'HRB-500ML', name: 'Hand Rub Sanitizer 500ml', category: 'COMMON', uom: 'btl', pricePerUnit: 180, reorderLevel: 50, stock: 92, leadTimeDays: 4, vendor: 'Generic', deviceIds: [], qtyPerPatient: 0.05 },
  { id: 'cns-bag', sku: 'BAG-DSP-50', name: 'Disposable Bio Bags (pack 50)', category: 'COMMON', uom: 'pack', pricePerUnit: 120, reorderLevel: 30, stock: 64, leadTimeDays: 5, vendor: 'Generic', deviceIds: [], qtyPerPatient: 0.1 },
  { id: 'cns-cotton', sku: 'COT-100G', name: 'Sterile Cotton (100 g)', category: 'COMMON', uom: 'pack', pricePerUnit: 60, reorderLevel: 60, stock: 142, leadTimeDays: 3, vendor: 'Generic', deviceIds: [], qtyPerPatient: 0.02 },
  { id: 'cns-mask', sku: 'MSK-3PLY', name: '3-ply masks (box 50)', category: 'COMMON', uom: 'box', pricePerUnit: 120, reorderLevel: 100, stock: 240, leadTimeDays: 3, vendor: 'Generic', deviceIds: [], qtyPerPatient: 1 },

  // Project-specific (associated with one or more devices)
  { id: 'cns-glu-strip', sku: 'CHK-GS-50', name: 'Glucose Strips (pack 50)', category: 'PROJECT', uom: 'pack', pricePerUnit: 850, reorderLevel: 100, stock: 412, leadTimeDays: 5, vendor: 'Roche', deviceIds: ['dev-glu', 'dev-lipid'], qtyPerPatient: 1 },
  { id: 'cns-lan', sku: 'LAN-SAFETY', name: 'Safety Lancets (box 100)', category: 'PROJECT', uom: 'box', pricePerUnit: 120, reorderLevel: 200, stock: 680, leadTimeDays: 4, vendor: 'Generic', deviceIds: ['dev-glu', 'dev-lipid', 'dev-hba1c'], qtyPerPatient: 1 },
  { id: 'cns-alc-swab', sku: 'ALC-SWB-100', name: 'Alcohol Swabs (pack 100)', category: 'PROJECT', uom: 'pack', pricePerUnit: 140, reorderLevel: 80, stock: 318, leadTimeDays: 4, vendor: 'Generic', deviceIds: ['dev-glu', 'dev-lipid', 'dev-hba1c', 'dev-spo'], qtyPerPatient: 1 },
  { id: 'cns-ecg-elec', sku: 'ECG-EL-50', name: 'ECG Electrodes (pack 50)', category: 'PROJECT', uom: 'pack', pricePerUnit: 380, reorderLevel: 80, stock: 142, leadTimeDays: 5, vendor: '3M', deviceIds: ['dev-ecg'], qtyPerPatient: 10 },
  { id: 'cns-ecg-jelly', sku: 'ECG-JL-1L', name: 'ECG Jelly (1L)', category: 'PROJECT', uom: 'litre', pricePerUnit: 220, reorderLevel: 30, stock: 56, leadTimeDays: 5, vendor: 'Generic', deviceIds: ['dev-ecg'], qtyPerPatient: 0.05 },
  { id: 'cns-lipid-rgnt', sku: 'LP-RGNT-25', name: 'Lipid Reagent (25 tests)', category: 'PROJECT', uom: 'pack', pricePerUnit: 2400, reorderLevel: 40, stock: 88, leadTimeDays: 10, vendor: 'Roche', deviceIds: ['dev-lipid'], qtyPerPatient: 0.04 },
  { id: 'cns-hba1c-rgnt', sku: 'HBA-RGNT-50', name: 'HbA1c Reagent (50 tests)', category: 'PROJECT', uom: 'pack', pricePerUnit: 5800, reorderLevel: 20, stock: 32, leadTimeDays: 12, vendor: 'Bio-Rad', deviceIds: ['dev-hba1c'], qtyPerPatient: 0.02 },
  { id: 'cns-spiro-mp', sku: 'SP-MP-100', name: 'Spirometry Mouthpiece (100)', category: 'PROJECT', uom: 'pack', pricePerUnit: 680, reorderLevel: 30, stock: 24, leadTimeDays: 8, vendor: 'Vitalograph', deviceIds: ['dev-spirom'], qtyPerPatient: 1 },
  { id: 'cns-spiro-pap', sku: 'SP-PAP-50', name: 'Spirometer Paper (pack 50)', category: 'PROJECT', uom: 'pack', pricePerUnit: 380, reorderLevel: 20, stock: 18, leadTimeDays: 8, vendor: 'Vitalograph', deviceIds: ['dev-spirom'], qtyPerPatient: 0.05 },
  { id: 'cns-nose-clip', sku: 'NSE-CLP', name: 'Nose Clips (pcs)', category: 'PROJECT', uom: 'pcs', pricePerUnit: 30, reorderLevel: 30, stock: 88, leadTimeDays: 6, vendor: 'Generic', deviceIds: ['dev-spirom'], qtyPerPatient: 1 },
  { id: 'cns-spo-cuff', sku: 'OX-CUF-AD', name: 'SpO2 Adult Sensor Cuff', category: 'PROJECT', uom: 'pcs', pricePerUnit: 240, reorderLevel: 50, stock: 84, leadTimeDays: 7, vendor: 'BPL', deviceIds: ['dev-spo'], qtyPerPatient: 0.02 },
]

// Full shape, verbatim transcription of admin-data.js's DEVICE_CATALOG
// (lines 513+) — includes usedForTests (Device→Test mapping) since Item
// Master's seed() needs it, plus pricePerUnit/calibIntervalDays for the AMC
// threshold + currentValue heuristic + calibration cadence, plus
// laymanDescription/faq/userManualUrl/videoUrl (Devices tab card body +
// invOpenDevice() drawer's Description/FAQ sections + Manual/Video action
// links). Corrected from an earlier partial transcription that had only 6
// (of 8) devices with placeholder usedForTests:[] — re-verified against the
// real source.
const DEVICE_CATALOG: DeviceCatalogItem[] = [
  { id: 'dev-glu', name: 'Accu-Chek Active', model: 'GA-500', vendor: 'Roche', type: 'Glucometer', pricePerUnit: 1200, paramCount: 1, calibIntervalDays: 90, unitsAvailable: 142, unitsDeployed: 38, usedForTests: ['tst-fbs', 'tst-ppbs', 'tst-rbs'],
    userManualUrl: '/files/manuals/accu-chek-active.pdf', videoUrl: 'https://youtu.be/example-accuchek',
    faq: 'Q: How long for results? A: ~5 sec. Q: Storage? A: 4–30°C, dry. Q: Calibration? A: Every 90 days.',
    laymanDescription: 'A small drop of blood from a finger gives sugar level in seconds — used to track diabetes day-to-day.' },
  { id: 'dev-bp', name: 'Omron HEM-7156', model: 'HEM-7156', vendor: 'Omron', type: 'BP Monitor', pricePerUnit: 2200, paramCount: 2, calibIntervalDays: 365, unitsAvailable: 86, unitsDeployed: 24, usedForTests: ['tst-bp'],
    userManualUrl: '/files/manuals/omron-hem-7156.pdf', videoUrl: 'https://youtu.be/example-omron',
    faq: 'Q: Best position? A: Sitting, arm at heart level. Q: Repeat? A: Wait 1 min between readings.',
    laymanDescription: 'A cuff wraps around the upper arm and measures blood pressure in under a minute.' },
  { id: 'dev-spo', name: 'BPL SpO2 Pro', model: 'OX-100', vendor: 'BPL', type: 'Pulse Oximeter', pricePerUnit: 1800, paramCount: 2, calibIntervalDays: 365, unitsAvailable: 48, unitsDeployed: 12, usedForTests: ['tst-spo2'],
    userManualUrl: '/files/manuals/bpl-spo2.pdf', videoUrl: '',
    faq: 'Q: Why my reading low? A: Cold finger or movement. Warm and retry.',
    laymanDescription: 'Clip on a fingertip — tells how much oxygen is in the blood and pulse rate.' },
  { id: 'dev-ecg', name: 'BPL Cardiart 6108T', model: '6108T', vendor: 'BPL', type: 'ECG (12-lead)', pricePerUnit: 32000, paramCount: 12, calibIntervalDays: 180, unitsAvailable: 18, unitsDeployed: 6, usedForTests: ['tst-ecg'],
    userManualUrl: '/files/manuals/cardiart-6108t.pdf', videoUrl: '',
    faq: 'Q: How long? A: 6 minutes. Q: Patient prep? A: Lie supine, expose chest, remove jewellery.',
    laymanDescription: 'Small stickers on chest, arms and legs record the heart’s electrical activity for a doctor to read.' },
  { id: 'dev-spirom', name: 'Vitalograph Spiro', model: 'Spiro USB', vendor: 'Vitalograph', type: 'Spirometer', pricePerUnit: 88000, paramCount: 5, calibIntervalDays: 90, unitsAvailable: 10, unitsDeployed: 4, usedForTests: ['tst-spiro'],
    userManualUrl: '/files/manuals/vitalograph-spiro.pdf', videoUrl: '',
    faq: 'Q: Patient instructions? A: Deep breath, blow hard and long. 3 valid blows needed.',
    laymanDescription: 'Patient blows hard into a mouthpiece — tells how strong and healthy the lungs are.' },
  { id: 'dev-lipid', name: 'Roche Cobas h232', model: 'h232', vendor: 'Roche', type: 'Lipid Analyser', pricePerUnit: 145000, paramCount: 4, calibIntervalDays: 60, unitsAvailable: 12, unitsDeployed: 5, usedForTests: ['tst-lipid'],
    userManualUrl: '/files/manuals/cobas-h232.pdf', videoUrl: '',
    faq: 'Q: Fasting? A: 12-hour fast required. Q: Sample? A: 35 µl finger-prick.',
    laymanDescription: 'Tiny finger-prick sample → cholesterol numbers (Total, HDL, LDL, Triglycerides).' },
  { id: 'dev-hba1c', name: 'Bio-Rad D-100', model: 'D-100', vendor: 'Bio-Rad', type: 'HbA1c Analyser', pricePerUnit: 220000, paramCount: 1, calibIntervalDays: 60, unitsAvailable: 6, unitsDeployed: 2, usedForTests: ['tst-hba1c'],
    userManualUrl: '/files/manuals/biorad-d100.pdf', videoUrl: '',
    faq: 'Q: Fasting? A: Not required. Q: Result time? A: ~3 minutes per sample.',
    laymanDescription: 'A blood sample shows the average sugar level over the last 2–3 months.' },
  { id: 'dev-bdy', name: 'Tanita BC-545N', model: 'BC-545N', vendor: 'Tanita', type: 'Body Composition', pricePerUnit: 25000, paramCount: 7, calibIntervalDays: 365, unitsAvailable: 22, unitsDeployed: 7, usedForTests: ['tst-bca'],
    userManualUrl: '/files/manuals/tanita-bc545.pdf', videoUrl: '',
    faq: 'Q: Footwear? A: Bare feet. Q: Hydration? A: Affects body water reading.',
    laymanDescription: 'Stand bare-foot for 30 seconds — tells weight, fat %, muscle mass and body water.' },
]

// Minimal id/code/name transcription of admin-data.js's TESTS catalog — Item
// Master's Device→Test mapping (testName() lookup) only needs these 3 fields;
// the full TESTS schema (params/interpretation/therapy/etc.) belongs to a
// future Camp/Test module.
const TESTS: TestCatalogItem[] = [
  { id: 'tst-fbs', code: 'FBS', name: 'Fasting Blood Sugar' },
  { id: 'tst-ppbs', code: 'PPBS', name: 'Post-prandial Blood Sugar' },
  { id: 'tst-rbs', code: 'RBS', name: 'Random Blood Sugar' },
  { id: 'tst-bp', code: 'BP', name: 'Blood Pressure' },
  { id: 'tst-spo2', code: 'SPO2', name: 'SpO2 (Oxygen Saturation)' },
  { id: 'tst-ecg', code: 'ECG', name: 'ECG (12-lead)' },
  { id: 'tst-lipid', code: 'LIPID', name: 'Lipid Profile' },
  { id: 'tst-hba1c', code: 'HbA1c', name: 'Glycated Haemoglobin' },
  { id: 'tst-spiro', code: 'SPIRO', name: 'Spirometry' },
  { id: 'tst-bca', code: 'BCA', name: 'Body Composition Analysis' },
]

// consumables() — exact port (inventory.js:143).
export function getConsumables(): Consumable[] {
  return CONSUMABLES
}

// devices() — exact port (inventory.js:142), only used here for the
// cross-tab type filter's dropdown options + deviceIds→type lookup.
export function getDeviceCatalog(): DeviceCatalogItem[] {
  return DEVICE_CATALOG
}

// tests() — exact port (inventory-masters.js:37), only id/code/name needed.
export function getTests(): TestCatalogItem[] {
  return TESTS
}

// testName() — exact port (inventory-masters.js:38).
export function testName(id: string): string {
  return TESTS.find((t) => t.id === id)?.name ?? id
}

// consumableStatus() — exact port (inventory.js:259-264). ratio =
// stock / max(1, reorderLevel); <=50% reorder → CRIT, <=100% reorder → LOW,
// else HEALTH with daysCover = round(ratio * 30) (reorderLevel treated as a
// ~30-day supply heuristic — only computed on the HEALTH branch).
export function consumableStatus(c: Consumable): ConsumableStatus {
  const ratio = c.stock / Math.max(1, c.reorderLevel)
  if (c.stock <= c.reorderLevel * 0.5) return { code: 'CRIT', label: 'Critical · below 50% reorder' }
  if (c.stock <= c.reorderLevel) return { code: 'LOW', label: 'Low · at/below reorder' }
  return { code: 'HEALTH', label: 'Healthy', daysCover: Math.round(ratio * 30) }
}

// inr() — exact port (inventory.js:130).
export function inr(n: number): string {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN')
}

// window.invRaisePO() — exact port (inventory.js:739-744). Purely a toast
// simulation: it does NOT create any PR/PO/GRN record in the real
// procurement pipeline (qms.inventory.prs/pos/grns) — preserved as-is, not
// "fixed" by wiring it into the genuine Procurement flow, per the port
// instruction to replicate exactly what exists.
export function raisePO(sku: string): { message: string } | null {
  const c = CONSUMABLES.find((x) => x.id === sku)
  if (!c) return null
  const qty = c.reorderLevel * 2 - c.stock
  return { message: `PO raised for ${c.sku} · ${qty} ${c.uom} · ${c.vendor} · ETA ${c.leadTimeDays}d` }
}

// ============================================================================
// Item Master (window.QMS_InvMasters, inventory-masters.js) — the unified
// qms.inventory.items registry backing the Item Master / Expiry-FEFO / Field
// Ops / Procurement tabs. localStorage-backed exactly like the prototype
// (window.localStorage.getItem/setItem('qms.inventory.items', ...)), versioned
// via SEED_VERSION so re-seeding only happens once (or when the shape bumps).
// ============================================================================

const ITEMS_STORAGE_KEY = 'qms.inventory.items'
const SEED_VERSION = 1

interface ItemsStore {
  _v: number
  rows: InventoryItem[]
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
// daysFromNow() — exact port (inventory-masters.js:32). Ceil rounding.
function daysFromNow(s?: string | null): number | null {
  return s ? Math.ceil((new Date(s).getTime() - Date.now()) / 86400000) : null
}

function loadItemsStore(): ItemsStore | null {
  try {
    const raw = localStorage.getItem(ITEMS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ItemsStore) : null
  } catch {
    return null
  }
}
function persistItemsStore(rows: InventoryItem[]): void {
  try {
    localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify({ _v: SEED_VERSION, rows }))
  } catch {
    // localStorage unavailable (e.g. private mode) — mock feature degrades to in-memory only.
  }
}

// deterministic expiry spread so every colour band is represented among the
// seeded consumable rows — exact port of EXP_PATTERN (inventory-masters.js:88).
const EXP_PATTERN = [320, 210, 150, 120, 86, 58, 24, 11, 240, 96, 44, 18, 300, 130, 70, 9]

// Hand-authored seed rows for Marketing Material / IT Asset / Office Asset —
// exact port of the `extra` array (inventory-masters.js:141-154). These types
// have no admin catalog to derive from, so the prototype bakes cost/warranty/
// depreciation/gst constants directly into this literal.
interface ExtraSeedRow {
  itemType: ItemType
  name: string
  code: string
  category: string
  vendor: string
  manufacturer?: string
  model?: string
  uom?: string
  qtyOnHand?: number
  purchaseCost?: number
  cost?: number
  gst: number
  expDays?: number
  storage?: string
  warrantyYears?: number
  amc?: boolean
  amcCost?: number
  deprPct?: number
  usefulLifeYears?: number
}

const EXTRA_SEED_ROWS: ExtraSeedRow[] = [
  // Marketing Material
  { itemType: 'Marketing Material', name: 'Camp Banner 6x3 (Vinyl)', code: 'MKT-BNR-6X3', category: 'Banners', vendor: 'PrintHub', uom: 'pcs', qtyOnHand: 140, purchaseCost: 280, gst: 12, expDays: 95, storage: 'Rolled · dry store' },
  { itemType: 'Marketing Material', name: 'Standee Roll-up 2x5', code: 'MKT-STD-2X5', category: 'Standee', vendor: 'PrintHub', uom: 'pcs', qtyOnHand: 60, purchaseCost: 950, gst: 12, expDays: 320, storage: 'Boxed · dry store' },
  { itemType: 'Marketing Material', name: 'Patient Brochure (pack 100)', code: 'MKT-BRC-100', category: 'Brochure', vendor: 'PrintHub', uom: 'pack', qtyOnHand: 88, purchaseCost: 600, gst: 12, expDays: 40, storage: 'Ambient · dry store' },
  { itemType: 'Marketing Material', name: 'Diet Chart Sheets (pack 50)', code: 'MKT-DCH-50', category: 'Diet Sheet', vendor: 'PrintHub', uom: 'pack', qtyOnHand: 132, purchaseCost: 320, gst: 12, expDays: 18, storage: 'Ambient · dry store' },
  // IT Assets
  { itemType: 'IT Asset', name: 'Lenovo ThinkPad E14', code: 'IT-LAP-E14', category: 'Laptop', vendor: 'Lenovo', manufacturer: 'Lenovo', model: 'E14 Gen5', cost: 62000, gst: 18, warrantyYears: 3, amc: true, amcCost: 4200, deprPct: 33, usefulLifeYears: 3 },
  { itemType: 'IT Asset', name: 'Samsung Galaxy Tab A9', code: 'IT-TAB-A9', category: 'Tablet', vendor: 'Samsung', manufacturer: 'Samsung', model: 'SM-X110', cost: 18000, gst: 18, warrantyYears: 1, amc: false, deprPct: 33, usefulLifeYears: 3 },
  { itemType: 'IT Asset', name: 'HP LaserJet M126', code: 'IT-PRN-M126', category: 'Printer', vendor: 'HP', manufacturer: 'HP', model: 'M126nw', cost: 14500, gst: 18, warrantyYears: 1, amc: true, amcCost: 1800, deprPct: 20, usefulLifeYears: 5 },
  // Office Assets
  { itemType: 'Office Asset', name: 'Ergo Office Chair', code: 'OFF-CHR-ERG', category: 'Furniture', vendor: 'Featherlite', manufacturer: 'Featherlite', model: 'Optima', cost: 9500, gst: 18, warrantyYears: 2, amc: false, deprPct: 15, usefulLifeYears: 7 },
  { itemType: 'Office Asset', name: 'Workstation Desk 4ft', code: 'OFF-DSK-4FT', category: 'Furniture', vendor: 'Featherlite', manufacturer: 'Featherlite', model: 'Desk-4', cost: 7200, gst: 18, warrantyYears: 2, amc: false, deprPct: 15, usefulLifeYears: 7 },
  { itemType: 'Office Asset', name: 'Voltas 1.5T Split AC', code: 'OFF-AC-15T', category: 'Appliance', vendor: 'Voltas', manufacturer: 'Voltas', model: '183V', cost: 38000, gst: 18, warrantyYears: 5, amc: true, amcCost: 2600, deprPct: 10, usefulLifeYears: 10 },
]

// seed() — exact port of inventory-masters.js:90-186. Devices ← DEVICE_CATALOG,
// Consumables ← CONSUMABLES (PROJECT/device-linked → 'Consumable', COMMON →
// 'General Consumable'), plus the 10 hardcoded extra rows for Marketing
// Material/IT Asset/Office Asset. Runs once — subsequent calls return the
// persisted (possibly user-edited) rows as long as the _v guard matches.
function seedItems(): InventoryItem[] {
  const existing = loadItemsStore()
  if (existing && existing._v === SEED_VERSION && Array.isArray(existing.rows) && existing.rows.length) {
    return existing.rows
  }

  const rows: InventoryItem[] = []
  const now = new Date()

  // 1) Devices ← DEVICE_CATALOG
  DEVICE_CATALOG.forEach((d, i) => {
    const purchase = addDays(now, -(420 + i * 55))
    const onHand = (d.unitsAvailable || 0) + (d.unitsDeployed || 0)
    const amcApplicable = d.pricePerUnit > 20000
    rows.push({
      id: 'itm-' + d.id,
      sourceId: d.id,
      itemType: 'Device',
      name: d.name,
      code: 'DEV-' + String(d.type).replace(/\W+/g, '').toUpperCase().slice(0, 6),
      category: d.type,
      manufacturer: d.vendor,
      vendor: d.vendor,
      model: d.model,
      serialNo: String(d.type).slice(0, 3).toUpperCase() + '-FLEET-' + String(i + 1).padStart(3, '0'),
      qrCode: 'QR-' + d.id.toUpperCase(),
      barcode: 'BAR' + (820000 + i),
      purchaseDate: isoDate(purchase),
      purchaseCost: d.pricePerUnit,
      gst: 18,
      invoiceNo: 'PINV-' + (24010 + i),
      warrantyYears: 2,
      warrantyEnd: isoDate(addDays(purchase, 730)),
      amcApplicable,
      amcCost: amcApplicable ? Math.round(d.pricePerUnit * 0.08) : 0,
      amcStart: amcApplicable ? isoDate(addDays(purchase, 730)) : '',
      amcEnd: amcApplicable ? isoDate(addDays(purchase, 1095)) : '',
      calibApplicable: true,
      calibFreqDays: d.calibIntervalDays,
      calibDue: isoDate(addDays(now, (i % 6) * 25 - 20)),
      usefulLifeYears: 5,
      deprMethod: 'Straight Line',
      deprPct: 20,
      currentValue: Math.round(d.pricePerUnit * 0.6),
      assetStatus: 'Available',
      usedForTests: (d.usedForTests || []).slice(),
      qtyOnHand: onHand,
      uom: 'unit',
      status: 'ACTIVE',
    })
  })

  // 2) Consumables ← CONSUMABLES (PROJECT with deviceIds → 'Consumable', else 'General Consumable')
  CONSUMABLES.forEach((c, i) => {
    const linked = c.deviceIds || []
    const itemType: ItemType = linked.length ? 'Consumable' : 'General Consumable'
    const mfg = addDays(now, -(150 + (i % 6) * 30))
    const exp = addDays(now, EXP_PATTERN[i % EXP_PATTERN.length])
    rows.push({
      id: 'itm-' + c.id,
      sourceId: c.id,
      itemType,
      name: c.name,
      code: c.sku,
      category: itemType === 'Consumable' ? 'Device Consumable' : 'General Consumable',
      vendor: c.vendor,
      uom: c.uom,
      qtyOnHand: c.stock,
      purchaseCost: c.pricePerUnit,
      gst: 12,
      batchNo: 'B' + String(c.sku).replace(/\W+/g, '') + '-' + (24001 + i),
      mfgDate: isoDate(mfg),
      expiryDate: isoDate(exp),
      storage: linked.length ? 'Cool & dry · 4–30°C' : 'Ambient · dry store',
      linkedDeviceId: linked[0] || '',
      reorderLevel: c.reorderLevel,
      status: 'ACTIVE',
    })
  })

  // 3) 10 hand-authored seed rows for Marketing Material / IT Asset / Office Asset
  EXTRA_SEED_ROWS.forEach((e, i) => {
    const purchase = addDays(now, -(200 + i * 45))
    if (isConsumableType(e.itemType)) {
      rows.push({
        id: 'itm-mkt-' + i,
        sourceId: '',
        itemType: e.itemType,
        name: e.name,
        code: e.code,
        category: e.category,
        vendor: e.vendor,
        uom: e.uom,
        qtyOnHand: e.qtyOnHand,
        purchaseCost: e.purchaseCost,
        gst: e.gst,
        batchNo: 'B' + e.code.replace(/\W+/g, '') + '-' + (24090 + i),
        mfgDate: isoDate(addDays(now, -120)),
        expiryDate: isoDate(addDays(now, e.expDays ?? 0)),
        storage: e.storage,
        linkedDeviceId: '',
        reorderLevel: 20,
        status: 'ACTIVE',
      })
    } else {
      const warrantyYears = e.warrantyYears ?? 0
      rows.push({
        id: 'itm-ast-' + i,
        sourceId: '',
        itemType: e.itemType,
        name: e.name,
        code: e.code,
        category: e.category,
        manufacturer: e.manufacturer || e.vendor,
        vendor: e.vendor,
        model: e.model || '',
        serialNo: e.code + '-' + String(1001 + i),
        qrCode: 'QR-' + e.code,
        barcode: 'BAR' + (840000 + i),
        purchaseDate: isoDate(purchase),
        purchaseCost: e.cost,
        gst: e.gst,
        invoiceNo: 'PINV-' + (24080 + i),
        warrantyYears: e.warrantyYears,
        warrantyEnd: isoDate(addDays(purchase, warrantyYears * 365)),
        amcApplicable: !!e.amc,
        amcCost: e.amcCost || 0,
        amcStart: e.amc ? isoDate(addDays(purchase, warrantyYears * 365)) : '',
        amcEnd: e.amc ? isoDate(addDays(purchase, warrantyYears * 365 + 365)) : '',
        calibApplicable: false,
        calibFreqDays: 0,
        calibDue: '',
        usefulLifeYears: e.usefulLifeYears,
        deprMethod: 'Written Down Value',
        deprPct: e.deprPct,
        currentValue: Math.round((e.cost || 0) * (1 - (e.deprPct || 0) / 100)),
        assetStatus: 'Available',
        usedForTests: [],
        qtyOnHand: 1,
        uom: 'unit',
        status: 'ACTIVE',
      })
    }
  })

  persistItemsStore(rows)
  return rows
}

// items() — exact port (inventory-masters.js:188).
export function getItems(): InventoryItem[] {
  return seedItems()
}

export function saveAllItems(rows: InventoryItem[]): void {
  persistItemsStore(rows)
}

export function itemById(id: string): InventoryItem | undefined {
  return getItems().find((x) => x.id === id)
}

// inrShort() — exact port (inventory-masters.js:22-28). ₹ with Cr/L/k suffixing.
export function inrShort(n: number): string {
  const v = Number(n) || 0
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(1) + ' Cr'
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(1) + ' L'
  if (v >= 1e3) return '₹' + (v / 1e3).toFixed(0) + 'k'
  return '₹' + v
}

// expiryBand() — exact port (inventory-masters.js:68-76). Ceil-rounded days
// remaining; boundaries are exclusive-upper (30/90/180 land in the NEXT
// (larger) band, not the smaller one).
export function expiryBand(expIso?: string | null): ExpiryBand | null {
  if (!expIso) return null
  const d = daysFromNow(expIso)
  if (d == null) return null
  if (d < 0) return { code: 'EXPIRED', label: `Expired ${Math.abs(d)}d ago`, days: d, css: 'red' }
  if (d < 30) return { code: 'RED', label: `${d}d left`, days: d, css: 'red' }
  if (d < 90) return { code: 'ORANGE', label: `${d}d left`, days: d, css: 'orange' }
  if (d < 180) return { code: 'YELLOW', label: `${d}d left`, days: d, css: 'yellow' }
  return { code: 'GREEN', label: `${d}d left`, days: d, css: 'green' }
}

// remainingLabel() — exact port (inventory-masters.js:77-83). Distinct from
// expiryBand()'s label: adds a "~Nmo" month suffix, and returns bare
// 'Expired' (no day count) rather than 'Expired Nd ago'.
export function remainingLabel(expIso?: string | null): string {
  const d = daysFromNow(expIso)
  if (d == null) return '—'
  if (d < 0) return 'Expired'
  const m = Math.round(d / 30)
  return `${d}d` + (m >= 1 ? ` · ~${m}mo` : '')
}

// Per-row Value computation — exact port of the shared expression used by
// both the Item Master table's Value column AND the toolbar's total-value
// summary (inventory-masters.js:270, 283). Asset types: per-unit current
// value (currentValue falling back to purchaseCost) — NOT qty × value, even
// for Device rows that represent a multi-unit fleet. Consumable types:
// qtyOnHand × purchaseCost (extended stock value).
export function itemValue(it: InventoryItem): number {
  if (isAssetType(it.itemType)) return it.currentValue || it.purchaseCost || 0
  return (it.qtyOnHand || 0) * (it.purchaseCost || 0)
}

// filtered() — exact port (inventory-masters.js:241-248). Type filter is an
// exact match ('ALL' bypasses); text filter lowercases the query and
// substring-matches against the space-joined 'name code vendor category'
// string (matches anywhere in the concatenation, not per-field).
export function filterItems(all: InventoryItem[], type: string, q: string): InventoryItem[] {
  const query = q.trim().toLowerCase()
  return all.filter((it) => {
    if (type !== 'ALL' && it.itemType !== type) return false
    if (query) {
      const hay = `${it.name || ''} ${it.code || ''} ${it.vendor || ''} ${it.category || ''}`.toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  })
}

// Create/edit form values — the subset of InventoryItem fields the modal's
// fieldsFor()/saveItem() (inventory-masters.js:448-565) actually collects,
// keyed as strings/booleans matching raw <input>/<select> values before
// saveItem()'s val()/valNum() coercion. undefined fields are simply not
// submitted (left at their previous/default value when editing).
export interface ItemFormValues {
  itemType: ItemType
  name: string
  code?: string
  category?: string
  vendor?: string
  gst?: number | null
  purchaseCost?: number | null
  // Asset-only
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
  usefulLifeYears?: number | null
  deprMethod?: InventoryItem['deprMethod']
  deprPct?: number | null
  currentValue?: number | null
  assetStatus?: InventoryItem['assetStatus']
  calibApplicable?: boolean
  calibFreqDays?: number | null
  calibDue?: string
  usedForTests?: string[]
  // Consumable-only
  uom?: string
  qtyOnHand?: number | null
  reorderLevel?: number | null
  batchNo?: string
  mfgDate?: string
  expiryDate?: string
  storage?: string
  linkedDeviceId?: string
}

// saveItem() — exact port (inventory-masters.js:532-565). Returns the saved
// record (created or updated). Throws if name is blank — the caller (the
// mutation hook) surfaces this as the 'Name is required' toast, exactly like
// the prototype's window.toast('Name is required','error') + abort.
export function saveItem(editId: string | null, form: ItemFormValues): InventoryItem {
  const name = form.name?.trim()
  if (!name) throw new Error('Name is required')

  const rows = getItems()
  const editing = editId ? rows.find((x) => x.id === editId) : undefined
  const rec: InventoryItem = editing
    ? { ...editing }
    : { id: 'itm-u-' + Date.now().toString(36), sourceId: '', status: 'ACTIVE', itemType: form.itemType, name }

  rec.itemType = form.itemType
  rec.name = name
  rec.code = form.code || ''
  rec.category = form.category || ''
  rec.vendor = form.vendor || ''
  rec.gst = form.gst ?? null
  rec.purchaseCost = form.purchaseCost ?? null

  if (isAssetType(form.itemType)) {
    rec.manufacturer = form.manufacturer || ''
    rec.model = form.model || ''
    rec.serialNo = form.serialNo || ''
    rec.qrCode = form.qrCode || ''
    rec.barcode = form.barcode || ''
    rec.purchaseDate = form.purchaseDate || ''
    rec.invoiceNo = form.invoiceNo || ''
    rec.warrantyYears = form.warrantyYears ?? null
    rec.warrantyEnd = form.warrantyEnd || ''
    rec.amcApplicable = !!form.amcApplicable
    rec.amcCost = form.amcCost ?? null
    rec.usefulLifeYears = form.usefulLifeYears ?? null
    rec.deprMethod = form.deprMethod
    rec.deprPct = form.deprPct ?? null
    rec.currentValue = form.currentValue ?? rec.purchaseCost ?? null
    rec.assetStatus = form.assetStatus
    rec.uom = 'unit'
    rec.qtyOnHand = rec.qtyOnHand ?? 1
    if (form.itemType === 'Device') {
      rec.calibApplicable = form.calibApplicable !== false
      rec.calibFreqDays = form.calibFreqDays ?? null
      rec.calibDue = form.calibDue || ''
      rec.usedForTests = form.usedForTests || []
    } else {
      rec.calibApplicable = false
      rec.usedForTests = []
    }
  } else {
    rec.uom = form.uom || ''
    rec.qtyOnHand = form.qtyOnHand ?? 0
    rec.reorderLevel = form.reorderLevel ?? null
    rec.batchNo = form.batchNo || ''
    rec.mfgDate = form.mfgDate || ''
    rec.expiryDate = form.expiryDate || ''
    rec.storage = form.storage || ''
    rec.linkedDeviceId = form.linkedDeviceId || ''
  }

  if (!editing) rows.unshift(rec)
  saveAllItems(rows)
  return rec
}

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

const UNITS_STORAGE_KEY = 'qms.inventory.units'

function loadUnitsStore(): InventoryUnit[] | null {
  try {
    const raw = localStorage.getItem(UNITS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? (parsed as InventoryUnit[]) : null
  } catch {
    return null
  }
}
function persistUnitsStore(units: InventoryUnit[]): void {
  try {
    localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units))
  } catch {
    // localStorage unavailable (e.g. private mode) — mock feature degrades to in-memory only.
  }
}

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
// Movements ledger (window.invNewMovement()/tabMovements(), inventory.js
// lines 221-235, 749-876) — Log Movement modal reachable from the Overview
// tab's shared page-head "New transfer" button, plus the standalone
// Movements tab (out of scope for this pass, wired here so both share one
// ledger + one seeding function).
// ============================================================================

const MOVEMENTS_STORAGE_KEY = 'qms.inventory.movements'

function loadMovementsStore(): Movement[] | null {
  try {
    const raw = localStorage.getItem(MOVEMENTS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? (parsed as Movement[]) : null
  } catch {
    return null
  }
}
function persistMovementsStore(movements: Movement[]): void {
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
// calibStatus()/deviceFleet() engine already defined above (Overview tab
// section) — a second copy of this exact engine previously accumulated here
// from a concurrent tab-building pass (duplicate UNITS_STORAGE_KEY/
// loadUnitsStore/seedUnits/calibStatus/deviceFleet declarations, which broke
// `tsc`). Consolidated back to the one definition above; do not re-declare.

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

// ============================================================================
// Warehouse & network locations (Warehouse tab) — exact port of
// inventory-warehouse.js. Network model: ONE central warehouse at Head
// Office (authoritative bulk stock = item.qtyOnHand on the shared
// qms.inventory.items store above); FO field stock + Dietitian stock are
// derived/display holdings; In-transit is the sum of open (IN_TRANSIT)
// transfers. Transfers (below) are the only way stock moves between
// locations in the prototype's model.
// ============================================================================

function hashStr(s: string): number {
  let h = 0
  const str = String(s)
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

// consumableItems() — exact port (inventory-warehouse.js:36). Reads the SAME
// unified qms.inventory.items store as Item Master (getItems() above), not
// the separate Consumables-tab catalog (getConsumables()).
export function consumableItems(): InventoryItem[] {
  return getItems().filter((it) => isConsumableType(it.itemType))
}

// allFos() — exact port (inventory-warehouse.js:38): active (not relieved)
// Field Officers from the shared people roster.
export function allFos(people: Person[]): Person[] {
  return people.filter((p) => p.role === 'Field Officer' && !p.relievedOn)
}

// ── Dietitian roster (qms.inventory.dietitians) — seedDietitians()/
// dietitians(), exact port (inventory-warehouse.js:45-60). A lightweight
// self-seeded roster distinct from the Person[] roster (the prototype's own
// dietitians() store is separate from window.QMS_MASTER.people) — mirrors
// the prototype exactly rather than reusing usePeopleData's 'Dietitian'-role
// rows, since the prototype only reaches into a live roster
// (window.QMS_OM.dietitianRoster()) when one happens to exist, else falls
// back to this fixed 4-row seed.
const DIETITIANS_STORAGE_KEY = 'qms.inventory.dietitians'

interface DietitiansStore {
  _v: number
  rows: DietitianRef[]
}

const DEFAULT_DIETITIANS: DietitianRef[] = [
  { id: 'die-anjali', name: 'Anjali Rao', hq: 'Mumbai' },
  { id: 'die-pooja', name: 'Pooja Menon', hq: 'Pune' },
  { id: 'die-sneha', name: 'Sneha Iyer', hq: 'Bangalore' },
  { id: 'die-farah', name: 'Farah Khan', hq: 'Hyderabad' },
]

function loadDietitiansStore(): DietitiansStore | null {
  try {
    const raw = localStorage.getItem(DIETITIANS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as DietitiansStore) : null
  } catch {
    return null
  }
}
function persistDietitiansStore(rows: DietitianRef[]): void {
  try {
    localStorage.setItem(DIETITIANS_STORAGE_KEY, JSON.stringify({ _v: 1, rows }))
  } catch {
    // localStorage unavailable — mock feature degrades to in-memory only.
  }
}

// seedDietitians() — exact port (inventory-warehouse.js:45-59). Idempotent:
// `_v:1` guard means it only actually seeds once per browser.
function seedDietitians(): DietitianRef[] {
  const cur = loadDietitiansStore()
  if (cur && cur._v === 1) return cur.rows
  const rows = DEFAULT_DIETITIANS
  persistDietitiansStore(rows)
  return rows
}

export function getDietitians(): DietitianRef[] {
  return seedDietitians()
}

// dietHoldings() — exact port (inventory-warehouse.js:63-70). Authoritative
// from the qms.inventory.allocations ledger (rows keyed 'DIET:<dietId>',
// qty > 0) when present; else a deterministic pseudo-random kit derived from
// hashStr(dietId) over General Consumable / Marketing Material items — NOT
// true randomness, so the same dietitian always renders the same kit.
export function dietHoldings(dietId: string): DietHoldings {
  const allocRows = loadAllocationsStore()
  const alloc = allocRows.filter((a) => a.holder === 'DIET:' + dietId && (a.qty || 0) > 0)
  if (alloc.length) {
    const cons: DietHoldings['consumables'] = alloc.map((a) => {
      const it = itemById(a.itemId)
      return { item: it ?? ({ id: a.itemId, itemType: 'Consumable', name: a.itemId, status: 'ACTIVE' } as InventoryItem), qty: a.qty, value: a.qty * (it?.purchaseCost || 0) }
    })
    return { consumables: cons, value: cons.reduce((s, c) => s + c.value, 0) }
  }
  const kit = getItems().filter((it) => it.itemType === 'General Consumable' || it.itemType === 'Marketing Material')
  const h = hashStr(dietId)
  const cons: DietHoldings['consumables'] = kit.map((it, i) => {
    const qty = 2 + ((h + i * 5) % 7)
    return { item: it, qty, value: qty * (it.purchaseCost || 0) }
  })
  return { consumables: cons, value: cons.reduce((a, c) => a + c.value, 0) }
}

// ── Location helpers — locOptions()/locLabel(), exact port
// (inventory-warehouse.js:73-86). ─────────────────────────────────────────
export function locOptions(people: Person[]): LocOption[] {
  const out: LocOption[] = [{ code: CENTRAL, label: CENTRAL_LABEL }]
  allFos(people).forEach((f) => out.push({ code: 'FO:' + f.id, label: 'FO · ' + f.name }))
  getDietitians().forEach((d) => out.push({ code: 'DIET:' + d.id, label: 'Dietitian · ' + d.name }))
  return out
}

export function locLabel(code: string, people: Person[]): string {
  if (!code) return '—'
  if (code === CENTRAL) return CENTRAL_LABEL
  if (code.startsWith('FO:')) {
    const f = people.find((p) => p.id === code.slice(3))
    return 'FO · ' + (f ? f.name : code.slice(3))
  }
  if (code.startsWith('DIET:')) {
    const d = getDietitians().find((x) => x.id === code.slice(5))
    return 'Dietitian · ' + (d ? d.name : code.slice(5))
  }
  if (code === 'VENDOR') return 'Vendor'
  return code
}

// ── Network valuation — exact port (inventory-warehouse.js:89-101). All
// monetary math uses purchaseCost (never sellingPrice/any other field). ────

// centralValue() — sum of qtyOnHand × purchaseCost over consumableItems().
export function centralValue(): number {
  return consumableItems().reduce((a, it) => a + (it.qtyOnHand || 0) * (it.purchaseCost || 0), 0)
}

// foFieldValue() — exact port of inventory-warehouse.js:92-95: sums
// masters().foHoldings(f.id).totalValue over allFos(), returning 0 if the
// per-FO holdings engine isn't available. The FO Inventory/Item Master
// foHoldings() engine (inventory-masters.js:616-625 — devices+consumables
// valuation seeded per-FO) is a SEPARATE tab's own build; this function
// takes it as an optional injected lookup so the Warehouse tab degrades
// gracefully to 0 (matching the prototype's `if (!masters() ||
// !masters().foHoldings) return 0`) until that tab wires a real one in.
export function foFieldValue(people: Person[], foHoldings?: (personId: string) => FoHoldings | undefined): number {
  if (!foHoldings) return 0
  return allFos(people).reduce((a, f) => a + (foHoldings(f.id)?.totalValue || 0), 0)
}

// dietFieldValue() — sum of dietHoldings(d.id).value over the dietitian roster.
export function dietFieldValue(): number {
  return getDietitians().reduce((a, d) => a + dietHoldings(d.id).value, 0)
}

// transitValue() — sum of qty × purchaseCost over IN_TRANSIT transfers.
export function transitValue(): number {
  return getTransfers().filter((t) => t.status === 'IN_TRANSIT').reduce((a, t) => {
    const it = itemById(t.itemId)
    return a + (t.qty || 0) * (it?.purchaseCost || 0)
  }, 0)
}

// ── Allocations ledger (qms.inventory.allocations) — read-only from the
// Warehouse tab's perspective (Field Ops owns writing it); only dietHoldings()
// above reads it, exact port of inventory-warehouse.js's loadStore('allocations', ...).
const ALLOCATIONS_STORAGE_KEY = 'qms.inventory.allocations'

interface AllocationsStoreRow {
  holder: string
  itemId: string
  qty: number
  batchNo?: string
  expiryDate?: string
  updatedOn: string
}

function loadAllocationsStore(): AllocationsStoreRow[] {
  try {
    const raw = localStorage.getItem(ALLOCATIONS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed?.rows) ? (parsed.rows as AllocationsStoreRow[]) : []
  } catch {
    return []
  }
}

// ── Transfers store (qms.inventory.transfers) — seedTransfers()/transfers()/
// saveTransfers(), exact port (inventory-warehouse.js:104-132). ────────────
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

export function transferById(id: string): Transfer | undefined {
  return getTransfers().find((t) => t.id === id)
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

export function newTransferPreset(preset?: TransferPreset): TransferPreset {
  return preset || {}
}

// ============================================================================
// Vendors + Procurement (window.QMS_InvProc, inventory-procurement.js) —
// seed()/seedVendors()/seedPriceHistory() exact port (lines 45-100). The
// prototype's seed() seeds vendors + price history + PRs + POs + GRNs
// together in one call since Vendors and Procurement are the same module —
// this port keeps vendors + price history as one shared seeding pass too
// (PRs/POs/GRNs belong to the separately-built Procurement tab).
// ============================================================================

const VENDORS_STORAGE_KEY = 'qms.inventory.vendors'
const PRICE_HIST_STORAGE_KEY = 'qms.inventory.pricehist'
const PROC_SEED_VERSION = 1

interface VendorsStore {
  _v: number
  rows: Vendor[]
}
interface PriceHistStore {
  _v: number
  rows: PriceHistoryRow[]
}

function loadVendorsStore(): VendorsStore | null {
  try {
    const raw = localStorage.getItem(VENDORS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as VendorsStore) : null
  } catch {
    return null
  }
}
function persistVendorsStore(rows: Vendor[]): void {
  try {
    localStorage.setItem(VENDORS_STORAGE_KEY, JSON.stringify({ _v: PROC_SEED_VERSION, rows }))
  } catch {
    // localStorage unavailable (e.g. private mode) — mock feature degrades to in-memory only.
  }
}

// name → category map — exact port of seedVendors()'s `cats` object
// (inventory-procurement.js:61). Unmapped names fall back to 'General'.
const VENDOR_CATEGORY_MAP: Record<string, string> = {
  Roche: 'Diagnostics', Omron: 'Devices', BPL: 'Devices', '3M': 'Consumables',
  'Bio-Rad': 'Diagnostics', Vitalograph: 'Devices', Generic: 'Consumables',
  Lenovo: 'IT', Samsung: 'IT', HP: 'IT', Featherlite: 'Furniture', Voltas: 'Appliances', PrintHub: 'Marketing',
}
const VENDOR_CITIES = ['Mumbai', 'Pune', 'Bangalore', 'Hyderabad', 'Delhi', 'Chennai']
const VENDOR_FIRST_NAMES = ['Ramesh', 'Sunita', 'Vikas', 'Priya', 'Arun', 'Neha']
const VENDOR_LAST_NAMES = ['Shah', 'Rao', 'Kulkarni', 'Nair']
// 6 hardcoded extra vendor names unioned in on top of catalog-derived vendors
// — exact port (inventory-procurement.js:59).
const VENDOR_EXTRA_NAMES = ['Lenovo', 'Samsung', 'HP', 'Featherlite', 'Voltas', 'PrintHub']

// seedVendors() — exact port (inventory-procurement.js:53-78). Collects
// distinct vendor names from DEVICE_CATALOG + CONSUMABLES, unions in 6
// hardcoded extras, then deterministically derives every field via
// hashStr(name)-seeded pseudo-randomness (NOT Math.random()) — so a given
// vendor name always renders the same scorecard across reloads.
function seedVendors(): Vendor[] {
  const existing = loadVendorsStore()
  if (existing && existing._v === PROC_SEED_VERSION && Array.isArray(existing.rows) && existing.rows.length) {
    return existing.rows
  }

  const names = new Set<string>()
  getDeviceCatalog().forEach((d) => names.add(d.vendor))
  getConsumables().forEach((c) => names.add(c.vendor))
  VENDOR_EXTRA_NAMES.forEach((n) => names.add(n))

  const rows: Vendor[] = Array.from(names).filter(Boolean).map((name, i) => {
    const h = hashStr(name)
    return {
      id: 'ven-' + name.toLowerCase().replace(/\W+/g, '').slice(0, 8) + '-' + i,
      name,
      gst: (27 + (h % 9)) + 'AAACS' + (1000 + (h % 8999)) + 'A1Z' + (h % 9),
      pan: 'AAACS' + (1000 + (h % 8999)) + 'A',
      city: VENDOR_CITIES[h % VENDOR_CITIES.length],
      state: 'MH',
      contact: VENDOR_FIRST_NAMES[h % 6] + ' ' + VENDOR_LAST_NAMES[h % 4],
      email: 'sales@' + name.toLowerCase().replace(/\W+/g, '') + '.com',
      phone: '+91 9' + (800000000 + (h % 99999999)),
      category: VENDOR_CATEGORY_MAP[name] || 'General',
      status: 'ACTIVE',
      priceListNote: 'Rate card on file · rev ' + (1 + (h % 4)),
      deliveryScore: 78 + (h % 20),
      qualityScore: 80 + ((h >> 2) % 18),
      complaintRate: ((h % 50) / 10).toFixed(1),
      costScore: 72 + ((h >> 3) % 25),
    }
  })

  persistVendorsStore(rows)
  return rows
}

export function getVendors(): Vendor[] {
  return seedVendors()
}

export function vendorById(id: string): Vendor | undefined {
  return getVendors().find((v) => v.id === id)
}

// Exposed for the (separately-built) Procurement tab's PO vendor lookups —
// same lookup the prototype's vendorByName() serves both tabs with.
export function vendorByName(name: string): Vendor | undefined {
  return getVendors().find((v) => v.name === name)
}

function loadPriceHistStore(): PriceHistStore | null {
  try {
    const raw = localStorage.getItem(PRICE_HIST_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PriceHistStore) : null
  } catch {
    return null
  }
}
function persistPriceHistStore(rows: PriceHistoryRow[]): void {
  try {
    localStorage.setItem(PRICE_HIST_STORAGE_KEY, JSON.stringify({ _v: PROC_SEED_VERSION, rows }))
  } catch {
    // localStorage unavailable (e.g. private mode) — mock feature degrades to in-memory only.
  }
}

// seedPriceHistory() — exact port (inventory-procurement.js:83-100). For
// every item in the shared item-master store with a purchaseCost, generates
// 5 historical price points (k=4..0, oldest→newest) spaced ~75 days apart,
// each unitCost = purchaseCost * (1 - 0.04*k + jitter) — i.e. prices trend
// UPWARD toward the present. freight = 3% of unit; landed = unit + freight +
// GST amount (item's own gst% or 12% default).
function seedPriceHistory(): PriceHistoryRow[] {
  const existing = loadPriceHistStore()
  if (existing && existing._v === PROC_SEED_VERSION && Array.isArray(existing.rows) && existing.rows.length) {
    return existing.rows
  }

  const rows: PriceHistoryRow[] = []
  getItems().forEach((it, idx) => {
    if (it.purchaseCost == null) return
    const h = hashStr(it.id)
    const ven = it.vendor || it.manufacturer || 'Generic'
    for (let k = 4; k >= 0; k--) {
      const base = it.purchaseCost * (1 - 0.04 * k + ((h >> k) % 5) / 100)
      const unit = Math.round(base)
      const freight = Math.round(unit * 0.03)
      const gstPct = it.gst || 12
      rows.push({
        itemId: it.id,
        itemName: it.name,
        vendor: ven,
        date: isoDate(addDays(new Date(), -(k * 75 + (idx % 20)))),
        unitCost: unit,
        gst: gstPct,
        freight,
        landed: unit + freight + Math.round(unit * gstPct / 100),
      })
    }
  })

  persistPriceHistStore(rows)
  return rows
}

export function getPriceHistory(): PriceHistoryRow[] {
  return seedPriceHistory()
}

// Vendor Detail drawer's price-history table — groups priceHist() rows by
// vendor NAME (not id), first 12 distinct items, each series sorted
// ascending by date to compute first vs last — exact port of openVendor()
// (inventory-procurement.js:265-274).
export interface VendorPriceTrendRow {
  itemName: string
  latestRate: number
  landed: number
  /** Percent change from first to last known price for this item, rounded. */
  changePct: number
}

export function vendorPriceTrend(vendorName: string): VendorPriceTrendRow[] {
  const supplied = getPriceHistory().filter((r) => r.vendor === vendorName)
  const byItem = new Map<string, PriceHistoryRow[]>()
  supplied.forEach((r) => {
    const list = byItem.get(r.itemName) ?? []
    list.push(r)
    byItem.set(r.itemName, list)
  })
  return Array.from(byItem.keys()).slice(0, 12).map((name) => {
    const series = [...(byItem.get(name) ?? [])].sort((a, b) => a.date.localeCompare(b.date))
    const first = series[0]
    const last = series[series.length - 1]
    const changePct = first.unitCost ? Math.round((last.unitCost - first.unitCost) / first.unitCost * 100) : 0
    return { itemName: name, latestRate: last.unitCost, landed: last.landed, changePct }
  })
}

// Vendor overall score — Math.round(avg(delivery, quality, cost)) — exact
// port of the shared expression used by both the vendor card badge and the
// drawer's Overall KPI tile (inventory-procurement.js:232, 267).
export function vendorOverallScore(v: Vendor): number {
  return Math.round((v.deliveryScore + v.qualityScore + v.costScore) / 3)
}

// Avatar tone — threshold-driven by overall score, exact port
// (inventory-procurement.js:233). Deliberately independent of the adjacent
// badge, which ALWAYS renders emerald (.po-status.po-CLOSED) regardless of
// tier — see VendorsTab for that visual quirk, preserved as-is.
export function vendorTone(overall: number): string {
  if (overall >= 88) return '#10b981'
  if (overall >= 78) return '#3b6dff'
  return '#f59e0b'
}

// Create/edit form values for the vendor modal — exact field set collected
// by openVendorEdit()'s f() helper (inventory-procurement.js:308-316).
export interface VendorFormValues {
  name: string
  category?: string
  gst?: string
  pan?: string
  contact?: string
  phone?: string
  email?: string
  city?: string
  deliveryScore?: number
  qualityScore?: number
  costScore?: number
  complaintRate?: string
}

// saveVendor() — exact port (inventory-procurement.js:322-333). Throws if
// name is blank (caller surfaces the 'Vendor name required' toast). New
// vendors get id='ven-u-'+Date.now().toString(36) + fixed
// status:'ACTIVE'/state:'MH'/priceListNote:'Manual entry' defaults and are
// unshifted to the front; edits mutate the existing record in place (no
// reordering).
export function saveVendor(editId: string | null, form: VendorFormValues): Vendor {
  const name = form.name?.trim()
  if (!name) throw new Error('Vendor name required')

  const rows = getVendors()
  const editing = editId ? rows.find((x) => x.id === editId) : undefined
  const rec: Vendor = editing
    ? { ...editing }
    : {
        id: 'ven-u-' + Date.now().toString(36),
        name,
        gst: '', pan: '', city: '', state: 'MH', contact: '', email: '', phone: '', category: '',
        status: 'ACTIVE',
        priceListNote: 'Manual entry',
        deliveryScore: 0, qualityScore: 0, costScore: 0, complaintRate: '0',
      }

  rec.name = name
  rec.category = form.category || ''
  rec.gst = form.gst || ''
  rec.pan = form.pan || ''
  rec.contact = form.contact || ''
  rec.phone = form.phone || ''
  rec.email = form.email || ''
  rec.city = form.city || ''
  rec.deliveryScore = Number(form.deliveryScore) || 0
  rec.qualityScore = Number(form.qualityScore) || 0
  rec.costScore = Number(form.costScore) || 0
  rec.complaintRate = form.complaintRate || '0'

  if (!editing) rows.unshift(rec)
  persistVendorsStore(rows)
  return rec
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

// ============================================================================
// Procurement (PRs/POs/GRNs) — window.QMS_InvProc's own qms.inventory.prs/
// pos/grns stores (inventory-procurement.js). The Procurement tab itself is
// a separate/later build; these minimal seed stores exist here so the
// Dashboards tab's Procurement/Finance/Operations KPI tiles + PO table read
// real (non-zero) numbers instead of empty arrays, per the task's "stub
// minimal mock arrays for cross-store fields" guidance. Shapes match
// PurchaseRequisition/PurchaseOrder/GoodsReceiptNote in inventory.types.ts
// exactly; seeding is deterministic (hashStr-derived), not Math.random().
// ============================================================================

const PRS_STORAGE_KEY = 'qms.inventory.prs'
const POS_STORAGE_KEY = 'qms.inventory.pos'
const GRNS_STORAGE_KEY = 'qms.inventory.grns'
const PROC_DOCS_SEED_VERSION = 1

interface PrsStore { _v: number; rows: PurchaseRequisition[] }
interface PosStore { _v: number; rows: PurchaseOrder[] }
interface GrnsStore { _v: number; rows: GoodsReceiptNote[] }

function loadPrsStore(): PrsStore | null {
  try {
    const raw = localStorage.getItem(PRS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PrsStore) : null
  } catch {
    return null
  }
}
function persistPrsStore(rows: PurchaseRequisition[]): void {
  try {
    localStorage.setItem(PRS_STORAGE_KEY, JSON.stringify({ _v: PROC_DOCS_SEED_VERSION, rows }))
  } catch {
    // localStorage unavailable — mock feature degrades to in-memory only.
  }
}
function loadPosStore(): PosStore | null {
  try {
    const raw = localStorage.getItem(POS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PosStore) : null
  } catch {
    return null
  }
}
function persistPosStore(rows: PurchaseOrder[]): void {
  try {
    localStorage.setItem(POS_STORAGE_KEY, JSON.stringify({ _v: PROC_DOCS_SEED_VERSION, rows }))
  } catch {
    // localStorage unavailable — mock feature degrades to in-memory only.
  }
}
function loadGrnsStore(): GrnsStore | null {
  try {
    const raw = localStorage.getItem(GRNS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as GrnsStore) : null
  } catch {
    return null
  }
}
function persistGrnsStore(rows: GoodsReceiptNote[]): void {
  try {
    localStorage.setItem(GRNS_STORAGE_KEY, JSON.stringify({ _v: PROC_DOCS_SEED_VERSION, rows }))
  } catch {
    // localStorage unavailable — mock feature degrades to in-memory only.
  }
}

// poTotal() — exact port (inventory-intel.js:47). unitRate × qty × (1 + gst%)
// + freight, rounded once at the end.
export function poTotal(p: PurchaseOrder): number {
  return Math.round(p.unitRate * p.qty * (1 + (p.gst || 0) / 100) + (p.freight || 0))
}

const PR_REASONS = ['Auto reorder · below threshold', 'Camp forecast shortage', 'Stock replenishment', 'New camp allocation']
const PO_PAY_TERMS: PurchaseOrder['paymentTerms'][] = ['Advance', 'Net 15', 'Net 30', 'Net 45']

// seedProcurementDocs() — a minimal deterministic PR/PO/GRN seed (not a
// prototype line-numbered port — inventory-procurement.js's own PR/PO/GRN
// tables are a separate/later tab build) derived from the shared item-master
// + vendor stores, so the Dashboards tab's Procurement/Finance/Operations
// tiles and PO table read plausible non-zero numbers. Idempotent via the
// `_v` guard, hashStr-seeded (not Math.random()) so results are stable
// across reloads.
function seedProcurementDocs(): { prs: PurchaseRequisition[]; pos: PurchaseOrder[]; grns: GoodsReceiptNote[] } {
  const existingPrs = loadPrsStore()
  const existingPos = loadPosStore()
  const existingGrns = loadGrnsStore()
  if (
    existingPrs && existingPrs._v === PROC_DOCS_SEED_VERSION && existingPrs.rows.length &&
    existingPos && existingPos._v === PROC_DOCS_SEED_VERSION && existingPos.rows.length &&
    existingGrns && existingGrns._v === PROC_DOCS_SEED_VERSION
  ) {
    return { prs: existingPrs.rows, pos: existingPos.rows, grns: existingGrns.rows }
  }

  const consItems = consumableItems().filter((it) => it.purchaseCost != null).slice(0, 14)
  const vs = getVendors()
  const now = new Date()

  const prs: PurchaseRequisition[] = []
  const pos: PurchaseOrder[] = []
  const grns: GoodsReceiptNote[] = []

  consItems.forEach((it, i) => {
    const h = hashStr(it.id)
    const ven = vs[h % Math.max(1, vs.length)]
    const qty = 20 + (h % 80)
    const prId = 'PR-' + (5100 + i)
    const poId = 'PO-' + (7100 + i)

    // PR — first 5 stay PENDING (mid-chain), rest are PO_CREATED (converted).
    const prStatus: PurchaseRequisition['status'] = i < 5 ? 'PENDING' : 'PO_CREATED'
    prs.push({
      id: prId,
      date: isoDate(addDays(now, -(20 - i))),
      source: i % 3 === 0 ? 'Auto Reorder' : i % 3 === 1 ? 'Camp Forecast' : 'Manual',
      itemId: it.id,
      itemName: it.name,
      uom: it.uom || 'unit',
      qty,
      reason: PR_REASONS[h % PR_REASONS.length],
      requester: 'Inventory module',
      stage: prStatus === 'PENDING' ? (['Requester', 'Ops Manager', 'Procurement', 'Finance'][i % 4]) : 'PO created',
      status: prStatus,
      history: [],
    })

    if (prStatus !== 'PO_CREATED') return

    // PO — cycles through AWAITING (needs OM approval) → OPEN → CLOSED.
    const poStatus: PurchaseOrder['status'] = i % 4 === 0 ? 'AWAITING' : i % 4 === 1 ? 'OPEN' : i % 4 === 2 ? 'CLOSED' : 'DELAYED'
    pos.push({
      id: poId,
      date: isoDate(addDays(now, -(18 - i))),
      prId,
      vendorId: ven?.id || '',
      vendorName: ven?.name || it.vendor || 'Generic',
      itemId: it.id,
      itemName: it.name,
      qty,
      uom: it.uom || 'unit',
      unitRate: it.purchaseCost || 0,
      gst: it.gst || 12,
      freight: Math.round((it.purchaseCost || 0) * qty * 0.02),
      paymentTerms: PO_PAY_TERMS[h % PO_PAY_TERMS.length],
      deliveryDays: 5 + (h % 10),
      expectedDate: isoDate(addDays(now, 5 + (h % 10))),
      status: poStatus,
      createdBy: 'Inventory module',
      approvedBy: poStatus === 'AWAITING' ? '' : 'Ops Manager',
      approvedAt: poStatus === 'AWAITING' ? undefined : isoDate(addDays(now, -(15 - i))),
    })

    if (poStatus === 'CLOSED') {
      grns.push({
        id: 'GRN-' + (9100 + i),
        date: isoDate(addDays(now, -(10 - i))),
        poId,
        vendorName: ven?.name || it.vendor || 'Generic',
        itemId: it.id,
        itemName: it.name,
        receivedQty: qty,
        acceptedQty: qty,
        rejectedQty: 0,
        batchNo: it.batchNo || '',
        expiryDate: it.expiryDate || '',
        invoiceNo: 'INV-' + (30000 + i),
        notes: '',
      })
    }
  })

  persistPrsStore(prs)
  persistPosStore(pos)
  persistGrnsStore(grns)
  return { prs, pos, grns }
}

export function getPrs(): PurchaseRequisition[] {
  return seedProcurementDocs().prs
}
export function getPos(): PurchaseOrder[] {
  return seedProcurementDocs().pos
}
export function getGrns(): GoodsReceiptNote[] {
  return seedProcurementDocs().grns
}

function savePrs(rows: PurchaseRequisition[]): void {
  persistPrsStore(rows)
}
function savePos(rows: PurchaseOrder[]): void {
  persistPosStore(rows)
}
function saveGrns(rows: GoodsReceiptNote[]): void {
  persistGrnsStore(rows)
}
function poById(id: string): PurchaseOrder | undefined {
  return getPos().find((p) => p.id === id)
}

// ============================================================================
// Procurement tab (window.QMS_InvProc.tabProcurement()/viewPR()/viewPO()/
// viewGRN(), inventory-procurement.js:336-641) — the REAL persisted PR → PO →
// GRN pipeline (as opposed to the Consumables tab's fire-and-forget
// raisePO()). Reuses the SAME qms.inventory.prs/pos/grns stores that
// seedProcurementDocs() above seeds for the Dashboards tab, so mutating here
// keeps both tabs' views of the data in sync (shared store, shared query key
// invalidation).
// ============================================================================

// mkPR() — exact port (inventory-procurement.js:120-132). history[] is
// pre-populated with 'approved' entries for every PR_CHAIN stage strictly
// before stageIdx, each dated progressively further in the past.
function mkPR(o: { itemId: string; qty: number; source: string; reason: string; stageIdx: number; seq: number; requester?: string }): PurchaseRequisition {
  const it = itemById(o.itemId)
  const stage = PR_CHAIN[o.stageIdx] || 'Requester'
  const approvedThrough = PR_CHAIN.slice(0, o.stageIdx)
  return {
    id: 'PR-' + (o.seq || (5000 + Math.floor(hashStr(o.itemId + o.qty) % 9000))),
    date: isoDate(new Date()),
    source: o.source || 'Manual',
    itemId: o.itemId,
    itemName: it?.name || o.itemId,
    uom: it?.uom || 'unit',
    qty: o.qty,
    reason: o.reason || '',
    requester: o.requester || 'Inventory Manager',
    stage,
    status: o.stageIdx >= PR_CHAIN.length ? 'APPROVED' : 'PENDING',
    history: approvedThrough.map((s, k) => ({
      stage: s,
      action: 'approved',
      by: s,
      at: isoDate(addDays(new Date(), -(approvedThrough.length - k))),
    })),
  }
}

// New requisition modal (openPR()/savePR()) form values — exact field set.
export interface PrFormValues {
  itemId: string
  qty: number
  source: string
  reason: string
}

// savePR() — exact port (inventory-procurement.js:404-411). Always raises at
// stageIdx 0 (Requester), unshifted to the front.
export function savePR(form: PrFormValues): PurchaseRequisition {
  if (!form.qty) throw new Error('Enter quantity')
  const rows = getPrs()
  const pr = mkPR({ itemId: form.itemId, qty: form.qty, source: form.source, reason: form.reason, stageIdx: 0, seq: 5000 + rows.length })
  rows.unshift(pr)
  savePrs(rows)
  return pr
}

// advancePR() — exact port (inventory-procurement.js:380-388). Rejecting
// freezes status/stage in place; approving records a history entry for the
// CURRENT stage then either terminally approves (past Finance) or advances to
// the next PR_CHAIN stage.
export function advancePR(id: string, approve: boolean): PurchaseRequisition {
  const rows = getPrs()
  const pr = rows.find((x) => x.id === id)
  if (!pr) throw new Error('PR not found')

  if (!approve) {
    pr.status = 'REJECTED'
    savePrs(rows)
    return pr
  }

  pr.history.push({ stage: pr.stage, action: 'approved', by: pr.stage, at: isoDate(new Date()) })
  const idx = PR_CHAIN.indexOf(pr.stage as PrStage)
  if (idx >= PR_CHAIN.length - 1) {
    pr.status = 'APPROVED'
    pr.stage = 'Approved'
  } else {
    pr.stage = PR_CHAIN[idx + 1]
  }
  savePrs(rows)
  return pr
}

// autoReorder() — exact port (inventory-procurement.js:413-425). Scans every
// consumable at/below reorder level; skips any that already has a PENDING PR
// open; raises the rest at stageIdx 0 with source 'Auto Reorder'. Returns the
// count raised (0 means either nothing was low, or everything low already had
// an open PR — the caller distinguishes those two cases via `hadLowItems`).
export function autoReorder(): { raised: number; hadLowItems: boolean } {
  const low = consumableItems().filter((c) => (c.qtyOnHand || 0) <= (c.reorderLevel || 0))
  if (!low.length) return { raised: 0, hadLowItems: false }

  const rows = getPrs()
  let made = 0
  low.forEach((c, i) => {
    if (rows.some((p) => p.itemId === c.id && p.status === 'PENDING')) return
    rows.unshift(mkPR({
      itemId: c.id,
      qty: Math.max(20, (c.reorderLevel || 40) * 2 - (c.qtyOnHand || 0)),
      source: 'Auto Reorder',
      reason: 'Auto: below reorder level',
      stageIdx: 0,
      seq: 6000 + rows.length + i,
    }))
    made++
  })
  savePrs(rows)
  return { raised: made, hadLowItems: true }
}

// prToPO() — exact port (inventory-procurement.js:470-486). Vendor is looked
// up by matching the PR's item's vendor NAME, falling back to the first
// vendor in the roster. Freight is 2% of (unitRate × qty); payment terms/
// delivery days are hardcoded Net 30 / 7 days. Marks the source PR
// status='PO_CREATED'/stage='PO created' (terminal, distinct from APPROVED).
export function prToPO(prId: string): PurchaseOrder {
  const prRows = getPrs()
  const pr = prRows.find((x) => x.id === prId)
  if (!pr) throw new Error('PR not found')

  const it = itemById(pr.itemId)
  const ven = (it?.vendor ? vendorByName(it.vendor) : undefined) ?? getVendors()[0]
  const poRows = getPos()
  const po: PurchaseOrder = {
    id: 'PO-' + (7300 + poRows.length),
    date: isoDate(new Date()),
    prId: pr.id,
    vendorId: ven?.id || '',
    vendorName: ven?.name || it?.vendor || '—',
    itemId: pr.itemId,
    itemName: pr.itemName,
    qty: pr.qty,
    uom: pr.uom,
    unitRate: it?.purchaseCost || 0,
    gst: it?.gst || 12,
    freight: Math.round((it?.purchaseCost || 0) * pr.qty * 0.02),
    paymentTerms: 'Net 30',
    deliveryDays: 7,
    expectedDate: isoDate(addDays(new Date(), 7)),
    status: 'AWAITING',
    createdBy: 'Logistics',
    approvedBy: '',
  }
  poRows.unshift(po)
  savePos(poRows)

  pr.status = 'PO_CREATED'
  pr.stage = 'PO created'
  savePrs(prRows)

  return po
}

// poFlow() — exact port (inventory-procurement.js:428-438). 4 PO-specific
// conceptual steps, NOT the same as PR_CHAIN: Logistics is always done (PO
// creation itself); OM approval is done unless AWAITING/CANCELLED ('cur'
// while AWAITING, 'rej' if CANCELLED); Open is done once OPEN or CLOSED
// ('cur' while OPEN); Received is done only once CLOSED.
export interface PoFlowStep {
  label: string
  state: 'done' | 'cur' | 'rej' | 'pending'
}

export function poFlow(p: PurchaseOrder): PoFlowStep[] {
  return [
    { label: 'Logistics', state: 'done' },
    { label: 'OM approval', state: p.status === 'CANCELLED' ? 'rej' : p.status === 'AWAITING' ? 'cur' : 'done' },
    { label: 'Open', state: p.status === 'OPEN' || p.status === 'CLOSED' ? (p.status === 'OPEN' ? 'cur' : 'done') : 'pending' },
    { label: 'Received', state: p.status === 'CLOSED' ? 'done' : 'pending' },
  ]
}

// Generate purchase order (direct, no PR) modal (openPOCreate()/
// savePOCreate()) form values — exact field set.
export interface PoCreateFormValues {
  itemId: string
  vendorId: string
  qty: number
  unitRate: number
  gst: number
  freight: number
  paymentTerms: string
  deliveryDays: number
}

// savePOCreate() — exact port (inventory-procurement.js:518-538). Always
// status='AWAITING', createdBy='Logistics', approvedBy=''.
export function savePOCreate(form: PoCreateFormValues): PurchaseOrder {
  if (!form.qty) throw new Error('Enter quantity')
  const it = itemById(form.itemId)
  const ven = vendorById(form.vendorId)
  const poRows = getPos()
  const po: PurchaseOrder = {
    id: 'PO-' + (7400 + poRows.length),
    date: isoDate(new Date()),
    prId: '',
    vendorId: ven?.id || '',
    vendorName: ven?.name || it?.vendor || '—',
    itemId: form.itemId,
    itemName: it?.name || form.itemId,
    qty: form.qty,
    uom: it?.uom || 'unit',
    unitRate: form.unitRate || 0,
    gst: form.gst || 0,
    freight: form.freight || 0,
    paymentTerms: form.paymentTerms,
    deliveryDays: form.deliveryDays,
    expectedDate: isoDate(addDays(new Date(), form.deliveryDays || 7)),
    status: 'AWAITING',
    createdBy: 'Logistics',
    approvedBy: '',
  }
  poRows.unshift(po)
  savePos(poRows)
  return po
}

// approvePO()/rejectPO() — exact port (inventory-procurement.js:539-548).
export function approvePO(id: string): PurchaseOrder {
  const rows = getPos()
  const p = rows.find((x) => x.id === id)
  if (!p) throw new Error('PO not found')
  p.status = 'OPEN'
  p.approvedBy = 'Ops Manager'
  p.approvedAt = isoDate(new Date())
  savePos(rows)
  return p
}

export function rejectPO(id: string): PurchaseOrder {
  const rows = getPos()
  const p = rows.find((x) => x.id === id)
  if (!p) throw new Error('PO not found')
  p.status = 'CANCELLED'
  p.approvedBy = 'Ops Manager (rejected)'
  savePos(rows)
  return p
}

// Goods receipt modal (openGRN()/saveGRN()) form values — exact field set.
export interface GrnFormValues {
  receivedQty: number
  acceptedQty: number
  rejectedQty: number
  batchNo: string
  expiryDate: string
  invoiceNo: string
  notes: string
}

// Default field prefills for openGRN() — exact port
// (inventory-procurement.js:610-617). Guards mirror the prototype's own:
// null if the PO doesn't exist, is still AWAITING approval, or is already
// CANCELLED/CLOSED (`blocked` distinguishes the latter two so the caller can
// show the right toast copy).
export interface GrnDefaults {
  po: PurchaseOrder
  receivedQty: number
  acceptedQty: number
  rejectedQty: number
  batchNo: string
  expiryDate: string
  invoiceNo: string
}

export type GrnOpenResult =
  | { ok: true; defaults: GrnDefaults }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'awaiting_approval' }
  | { ok: false; reason: 'blocked'; status: PoStatus }

export function openGrnDefaults(poId: string): GrnOpenResult {
  const p = poById(poId)
  if (!p) return { ok: false, reason: 'not_found' }
  if (p.status === 'AWAITING') return { ok: false, reason: 'awaiting_approval' }
  if (p.status === 'CANCELLED' || p.status === 'CLOSED') return { ok: false, reason: 'blocked', status: p.status }

  const grnCount = getGrns().length
  return {
    ok: true,
    defaults: {
      po: p,
      receivedQty: p.qty,
      acceptedQty: p.qty,
      rejectedQty: 0,
      batchNo: `B${(p.itemId || '').replace(/\W+/g, '').toUpperCase().slice(0, 6)}-${24300 + grnCount}`,
      expiryDate: isoDate(addDays(new Date(), 365)),
      invoiceNo: `VINV-${5600 + grnCount}`,
    },
  }
}

// saveGRN() — exact port (inventory-procurement.js:623-641). Creates the GRN
// row, credits the underlying item's qtyOnHand by acceptedQty (overwriting
// batchNo/expiryDate if provided), closes the PO. Returns the new item
// qtyOnHand (if the item was found) so the caller can build the exact
// '+{acc} to stock (now {qty})' toast copy.
export interface SaveGrnResult {
  grn: GoodsReceiptNote
  newQtyOnHand: number | null
}

export function saveGRN(poId: string, form: GrnFormValues): SaveGrnResult {
  const p = poById(poId)
  if (!p) throw new Error('PO not found')

  const gRows = getGrns()
  const g: GoodsReceiptNote = {
    id: 'GRN-' + (9200 + gRows.length),
    date: isoDate(new Date()),
    poId: p.id,
    vendorName: p.vendorName,
    itemId: p.itemId,
    itemName: p.itemName,
    receivedQty: form.receivedQty,
    acceptedQty: form.acceptedQty,
    rejectedQty: form.rejectedQty,
    batchNo: form.batchNo.trim(),
    expiryDate: form.expiryDate,
    invoiceNo: form.invoiceNo,
    notes: form.notes,
  }
  gRows.unshift(g)
  saveGrns(gRows)

  const itemRows = getItems()
  const it = itemRows.find((x) => x.id === p.itemId)
  let newQtyOnHand: number | null = null
  if (it) {
    it.qtyOnHand = (it.qtyOnHand || 0) + form.acceptedQty
    if (g.batchNo) it.batchNo = g.batchNo
    if (form.expiryDate) it.expiryDate = form.expiryDate
    saveAllItems(itemRows)
    newQtyOnHand = it.qtyOnHand
  }

  const poRows = getPos()
  const po = poRows.find((x) => x.id === poId)
  if (po) {
    po.status = 'CLOSED'
    savePos(poRows)
  }

  return { grn: g, newQtyOnHand }
}

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
// loadAllocationsStore() declared above (Warehouse tab's dietHoldings() reads
// the same store read-only; Field Ops is the only writer).
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
function loadReportsStore(): ReportsStore | null {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ReportsStore) : null
  } catch {
    return null
  }
}
function persistReportsStore(rows: FieldReport[]): void {
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
// Dashboards tab (window.QMS_InvIntel.tabDashboards()/dashBody(), inventory-
// intel.js lines 105-315) — exact port of the synthesis-layer computations:
// valuation()/logisticsRollup()/forecast()/campReadiness()/priceAlerts()/
// calibDue(), each pure and recomputed live from the shared stores above.
// ============================================================================

// qpp() — exact port (inventory-intel.js:46). Looks up the ORIGINAL
// CONSUMABLES catalog (not the item-master row) by the item's sourceId for
// qtyPerPatient, defaulting to 0.05 when no match (e.g. General
// Consumable/Marketing Material/asset rows whose sourceId is '' or unmapped).
function qpp(it: InventoryItem): number {
  const c = getConsumables().find((x) => x.id === it.sourceId)
  return c ? c.qtyPerPatient || 0 : 0.05
}

// assetItems() — exact port (inventory-intel.js:28).
export function assetItems(): InventoryItem[] {
  return getItems().filter((it) => isAssetType(it.itemType))
}

// camps() (Dashboards' own full-shape view) — exact port of
// inventory-intel.js:32's fallback branch, reusing the same Camp[] mock
// roster as the Transfers tab's narrower camps() helper above (see that
// function's comment) — this Dashboards section needs the FULL Camp shape
// (date/status/city/foId/devicesAllocated/type), not just the patient-count
// slice, so it declares its own typed accessor rather than reusing the
// narrower one.
function dashCamps() {
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
  ready: { c: (typeof CAMPS)[number]; r: CampReadinessScore }[]
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

// ============================================================================
// FO Inventory tab (window.QMS_InvMasters.tabFoInventory()/foHoldings()/
// foDeviceHoldings()/foConsumableHoldings()/openFoInventory(), inventory-
// masters.js lines 569-722) — the per-FO holdings + valuation engine, shared
// verbatim with the FO Profile page's own embedded foInventoryHtml() block
// elsewhere in the app (not built in this pass). Reuses the shared
// qms.inventory.units ledger (seedUnits(), Devices/Overview/Calibration
// section above) and the shared qms.inventory.items store (getItems() /
// Item Master section above) — this section adds no new persisted store of
// its own beyond reading the allocations ledger below.
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
// truth shared by this tab AND the (separately-built) Field Ops → Allocations
// sub-tab, both reading the same qms.inventory.allocations ledger. expSoon
// counts consumables whose band is red OR orange (<90 days remaining or
// expired) — yellow/green do not count.
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
  campsAtRisk: { c: (typeof CAMPS)[number]; r: CampReadinessScore }[]
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

// ============================================================================
// Audit tab (window.QMS_InvIntel.tabAudit(), inventory-intel.js lines
// 449-470) — merges SEVEN separate stores into one flat, chronologically
// sorted ledger. Exact port of the `ev.push(...)` sequence: order here only
// matters for the filter <select>'s type de-dup ordering, not final row
// order (everything is re-sorted by date after this function returns).
// Sorting/filtering/the 200-row display cap are all applied by the caller
// (buildAuditRows below), matching tabAudit()'s own post-processing order.
// ============================================================================

export function buildAuditEvents(
  units: InventoryUnit[],
  people: Person[],
): AuditEvent[] {
  const ev: AuditEvent[] = []

  getMovements(units).forEach((m) => {
    ev.push({
      date: m.date,
      type: 'Movement',
      ref: m.id,
      who: m.by || 'System',
      detail: `${m.type || ''} · ${m.deviceType || ''} · ${m.from || ''} → ${m.to || ''}`,
    })
  })
  getTransfers().forEach((t) => {
    ev.push({
      date: t.date,
      type: 'Transfer',
      ref: t.id,
      who: 'Logistics',
      detail: `${t.itemName} ×${t.qty} · ${t.status}`,
    })
  })
  getRefills(units, people).forEach((r) => {
    ev.push({
      date: r.date,
      type: 'Refill',
      ref: r.id,
      who: 'Field',
      detail: `${r.itemName} ×${r.qty} · ${r.status}`,
    })
  })
  getFieldReports(units, people).forEach((r) => {
    ev.push({
      date: r.date,
      type: 'Field report',
      ref: r.id,
      who: 'Field',
      detail: `${r.type} · ${r.itemName} ×${r.qty}`,
    })
  })
  getGrns().forEach((g) => {
    ev.push({
      date: g.date,
      type: 'Goods receipt',
      ref: g.id,
      who: 'Stores',
      detail: `${g.itemName} · accepted ${g.acceptedQty}`,
    })
  })
  getPrs().forEach((p) => {
    ev.push({
      date: p.date,
      type: 'Requisition',
      ref: p.id,
      who: p.requester || 'Requester',
      detail: `${p.itemName} ×${p.qty} · ${p.status}`,
    })
  })
  getPos().forEach((p) => {
    ev.push({
      date: p.date,
      type: 'Purchase order',
      ref: p.id,
      who: p.createdBy || 'Logistics',
      detail: `${p.itemName} · ${p.status}${p.approvedBy ? ' · ' + p.approvedBy : ''}`,
    })
  })

  return ev
}

// types = ['ALL', ...new Set(ev.map(e => e.type))] — exact port. Preserves
// first-seen order (Movement/Transfer/Refill/Field report/Goods receipt/
// Requisition/Purchase order), so a type with zero rows in the current data
// simply never appears as a filter option.
export function auditEventTypes(events: AuditEvent[]): (AuditEvent['type'] | 'ALL')[] {
  return ['ALL', ...Array.from(new Set(events.map((e) => e.type)))]
}

// rows = ev.sort((a,b) => (b.date||'').localeCompare(a.date||'')) then
// optional exact-match type filter, exact port of tabAudit()'s own
// post-processing (inventory-intel.js:460-461). Deliberately a STRING sort
// (not Date-object parsing) — every source date in this codebase is an ISO
// 'YYYY-MM-DD' string, so this sorts correctly descending; replicate as-is
// rather than "fixing" it to Date-based sorting.
export function filterAuditEvents(events: AuditEvent[], type: string): AuditEvent[] {
  const sorted = [...events].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  if (type !== 'ALL') return sorted.filter((e) => e.type === type)
  return sorted
}

// body = rows.slice(0,200) — exact port. NOTE: the caller's displayed
// '{rows.length} events' counter must read the FULL filtered array's length
// (pre-slice), not this capped array's length — that discrepancy (count can
// exceed 200 while only 200 rows render) is intentional, preserved from the
// prototype, and must not be "corrected".
export function auditDisplayRows(filteredEvents: AuditEvent[]): AuditEvent[] {
  return filteredEvents.slice(0, 200)
}
