// Procurement domain service — Purchase Requisition → Purchase Order →
// Goods Receipt Note pipeline, plus the minimal PR/PO/GRN seed stores the
// Dashboards tab's tiles read from. Split out of the original
// inventory.service.ts (Phase 3 service breakup) — every function below is
// moved verbatim, no behavior change.

import type {
  PurchaseRequisition, PurchaseOrder, GoodsReceiptNote, PrStage, PoStatus,
} from '@/features/inventory/inventory.types'
import { PR_CHAIN } from '@/features/inventory/inventory.types'
import { addDays, isoDate } from './shared/date'
import { hashStr } from './shared/calculations'
import { consumableItems, getVendors, vendorByName, vendorById, itemById, getItems, saveAllItems } from './inventory.service'

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
