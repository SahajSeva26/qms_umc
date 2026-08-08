// Inventory domain service — Item Master CRUD, Vendors, Warehouse/network
// locations, and the shared mock catalogs (Consumables/Devices/Tests) they're
// seeded from. Split out of the original inventory.service.ts (Phase 3
// service breakup) — every function below is moved verbatim, no behavior
// change. Units/Fleet/Calibration live in ./fleet.service; Movements/
// Transfers/Field Ops live in ./movement.service.

import type { Person } from '@/types/people.types'
import type {
  Consumable, ConsumableStatus, DeviceCatalogItem, TestCatalogItem,
  InventoryItem, ItemType, ExpiryBand,
  DietitianRef, DietHoldings, LocOption, FoHoldings,
  Vendor, PriceHistoryRow,
} from '@/features/inventory/inventory.types'
import { isAssetType, isConsumableType, CENTRAL, CENTRAL_LABEL } from '@/features/inventory/inventory.types'
import { addDays, isoDate, daysFromNow } from './shared/date'
import { hashStr } from './shared/calculations'
import { getTransfers } from './movement.service'

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
// Warehouse & network locations (Warehouse tab) — exact port of
// inventory-warehouse.js. Network model: ONE central warehouse at Head
// Office (authoritative bulk stock = item.qtyOnHand on the shared
// qms.inventory.items store above); FO field stock + Dietitian stock are
// derived/display holdings; In-transit is the sum of open (IN_TRANSIT)
// transfers. Transfers (below) are the only way stock moves between
// locations in the prototype's model.
// ============================================================================

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

export interface AllocationsStoreRow {
  holder: string
  itemId: string
  qty: number
  batchNo?: string
  expiryDate?: string
  updatedOn: string
}

// Exported (not just used internally by dietHoldings() above) — the FO
// Inventory tab's foConsumableHoldings() (services/fleet.service.ts) reads
// this SAME read-only accessor, exact port of the prototype's two independent
// callers of loadStore('allocations', ...).
export function loadAllocationsStore(): AllocationsStoreRow[] {
  try {
    const raw = localStorage.getItem(ALLOCATIONS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed?.rows) ? (parsed.rows as AllocationsStoreRow[]) : []
  } catch {
    return []
  }
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
