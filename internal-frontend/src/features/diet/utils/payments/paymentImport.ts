// Pure parsing/planning for the Dietitian Payment screen's two CSV imports.
//
// These functions ONLY transform and validate — they never persist. The page
// takes the returned plan and writes it through dietitianPayment.service, then
// invalidates the Diet query cache. Keeping persistence out of here is what
// makes the parsing rules testable in isolation.
//
// Freshness note (Phase 1): the reconciliation planner deliberately does NOT
// take a DietitianRollupIndex snapshot. Its ledger/expense lookups are
// injected as callbacks so they read live on every row — reconciliation
// interleaves with payment writes, and a snapshot would go stale.

import type { Camp } from '@/types/camp.types'
import type { DietPayment } from '@/features/diet/dietitians.types'
import { todayIso, normDate, normPayStatus } from './paymentCsv'

/** Case-insensitive header lookup accepting several aliases per column. */
function headerIndexer(header: string[]) {
  return (...names: string[]) => {
    for (const n of names) {
      const i = header.findIndex((h) => h.toLowerCase() === n.toLowerCase())
      if (i >= 0) return i
    }
    return -1
  }
}

/** A ledger row ready to hand to addDietPayment(). */
export type LedgerImportPayload = Omit<DietPayment, 'id' | 'paidAt'>

/**
 * §4 loose ledger import — one payment per CSV row. Rows without a dietitian
 * id or without a non-zero amount are skipped (not errors).
 */
export function planLedgerImport(rowsRaw: string[][]): LedgerImportPayload[] {
  const header = rowsRaw[0].map((h) => h.trim())
  const idx = headerIndexer(header)

  const iDietId = idx('Dietitian_ID', 'dietitianId')
  const iAmount = idx('Amount_INR', 'amount')
  const iDietName = idx('Dietitian', 'dietitianName')
  const iDate = idx('Date', 'paidOn')
  const iMode = idx('Mode', 'mode')
  const iRef = idx('Reference', 'ref')
  const iCamps = idx('Camps', 'campIds')
  const iBy = idx('By', 'paidBy')
  const iNotes = idx('Notes', 'notes')

  const out: LedgerImportPayload[] = []
  for (let r = 1; r < rowsRaw.length; r++) {
    const cells = rowsRaw[r]
    const dietitianId = iDietId >= 0 ? cells[iDietId]?.trim() : ''
    if (!dietitianId) continue
    const amount = iAmount >= 0 ? Number(cells[iAmount]) : 0
    if (!amount) continue
    out.push({
      dietitianId,
      dietitianName: (iDietName >= 0 && cells[iDietName]?.trim()) || dietitianId,
      amount,
      campIds: iCamps >= 0 ? (cells[iCamps] || '').split(/[|,]/).map((s) => s.trim()).filter(Boolean) : [],
      paidOn: (iDate >= 0 && cells[iDate]?.trim()) || todayIso(),
      mode: ((iMode >= 0 && cells[iMode]?.trim()) || 'BANK').toUpperCase() as DietPayment['mode'],
      ref: (iRef >= 0 && cells[iRef]?.trim()) || '',
      notes: (iNotes >= 0 && cells[iNotes]?.trim()) || '',
      paidBy: (iBy >= 0 && cells[iBy]?.trim()) || 'CSV import',
    })
  }
  return out
}

// ── §6 Finance reconciliation ────────────────────────────────────────────

/** Live lookups the planner needs. Injected so each call reads current data. */
export interface ReconciliationDeps {
  /** True if the ledger already holds a payout referencing this camp. */
  hasExistingPayment: (campId: string) => boolean
  /** Rounded payable total for a camp, used for the discrepancy check. */
  payableFor: (camp: Camp) => number
  /** Display name for a dietitian id (falls back to the id). */
  dietitianNameFor: (dietitianId: string) => string
}

/** One grouped payout the page will persist. */
export interface ReconciliationGroup {
  dietitianId: string
  dietitianName: string
  paidOn: string
  mode: string
  ref: string
  campIds: string[]
  amount: number
  remarks: string[]
}

export interface ReconciliationPlan {
  groups: ReconciliationGroup[]
  totalRows: number
  alreadyDone: number
  held: number
  rejected: number
  pendingBlank: number
  discrepancies: string[]
  notFound: string[]
}

/**
 * Groups PAID rows into payouts keyed by dietitian|date|mode|ref, and tallies
 * the HOLD/REJECTED/blank rows plus any discrepancies. Persists nothing.
 *
 * `formatAmount` is injected rather than importing fmtInr so this stays free
 * of display concerns while producing the exact same discrepancy strings.
 */
export function planReconciliation(
  rowsRaw: string[][],
  camps: Camp[],
  deps: ReconciliationDeps,
  formatAmount: (n: number) => string,
): ReconciliationPlan {
  const header = rowsRaw[0].map((h) => h.trim())
  const idx = headerIndexer(header)

  const iCampId = idx('Camp_ID', 'campId')
  const iDietitianId = idx('Dietitian_ID', 'dietitianId')
  const iStatus = idx('Payment_Status', 'status')
  const iPaidAmt = idx('Paid_Amount_INR', 'paidAmount')
  const iPaidDate = idx('Payment_Date', 'paidOn')
  const iMode = idx('Payment_Mode', 'mode')
  const iRef = idx('UTR_Reference', 'utr', 'Reference', 'ref')
  const iRemarks = idx('Finance_Remarks', 'remarks')

  let held = 0, rejected = 0, pendingBlank = 0, alreadyDone = 0
  const notFound: string[] = []
  const discrepancies: string[] = []
  const groups = new Map<string, ReconciliationGroup>()

  for (let r = 1; r < rowsRaw.length; r++) {
    const cells = rowsRaw[r]
    const campId = iCampId >= 0 ? cells[iCampId]?.trim() : ''
    if (!campId) continue
    const camp = camps.find((c) => c.id === campId)
    if (!camp) { notFound.push(campId); continue }
    const status = normPayStatus(iStatus >= 0 ? cells[iStatus] : '')
    const remark = (iRemarks >= 0 && cells[iRemarks]?.trim()) || ''

    if (status === 'PAID') {
      if (deps.hasExistingPayment(campId)) { alreadyDone++; continue }
      // dietitian-payment.js:945 falls back to the CSV row's own Dietitian_ID
      // when the matched camp itself lacks one, rather than treating the row
      // as "camp not found" (the camp WAS found, it just has no dietitian).
      const dietitianId = camp.dietitianId || (iDietitianId >= 0 ? cells[iDietitianId]?.trim() : '')
      if (!dietitianId) { notFound.push(campId); continue }
      const payable = deps.payableFor(camp)
      const rawPaidAmt = iPaidAmt >= 0 ? Number(cells[iPaidAmt]) : NaN
      const paidAmt = Math.round(rawPaidAmt) || payable
      const paidOn = normDate(iPaidDate >= 0 ? cells[iPaidDate] : '')
      const mode = ((iMode >= 0 && cells[iMode]?.trim()) || 'BANK').toUpperCase()
      const ref = (iRef >= 0 && cells[iRef]?.trim()) || ''
      const key = `${dietitianId}|${paidOn}|${mode}|${ref || campId}`
      if (Math.abs(paidAmt - payable) > 1) {
        discrepancies.push(`${campId} · finance paid ${formatAmount(paidAmt)} vs payable ${formatAmount(payable)}`)
      }
      const g = groups.get(key) ?? {
        dietitianId, dietitianName: deps.dietitianNameFor(dietitianId),
        paidOn, mode, ref, campIds: [], amount: 0, remarks: [],
      }
      g.campIds.push(campId)
      g.amount += paidAmt
      if (remark) g.remarks.push(`${campId}: ${remark}`)
      groups.set(key, g)
    } else if (status === 'HOLD') {
      held++
      if (deps.hasExistingPayment(campId)) {
        discrepancies.push(`${campId} · file says HOLD but a payout already exists in the ledger`)
      }
    } else if (status === 'REJECTED') {
      rejected++
      if (deps.hasExistingPayment(campId)) {
        discrepancies.push(`${campId} · file says REJECTED but a payout already exists in the ledger`)
      }
    } else {
      pendingBlank++
    }
  }

  return {
    groups: Array.from(groups.values()),
    totalRows: rowsRaw.length - 1,
    alreadyDone, held, rejected, pendingBlank, discrepancies, notFound,
  }
}

/** Maps a planned group onto the addDietPayment() payload shape. */
export function reconciliationGroupToPayment(g: ReconciliationGroup): Omit<DietPayment, 'id' | 'paidAt'> {
  return {
    dietitianId: g.dietitianId,
    dietitianName: g.dietitianName,
    amount: g.amount,
    campIds: g.campIds,
    paidOn: g.paidOn,
    mode: (['BANK', 'UPI', 'CHEQUE', 'CASH'].includes(g.mode) ? g.mode : 'BANK') as DietPayment['mode'],
    ref: g.ref,
    notes: 'Reconciled from finance import' + (g.remarks.length ? ' · ' + g.remarks.join('; ') : ''),
    paidBy: 'Finance reconciliation',
  }
}
