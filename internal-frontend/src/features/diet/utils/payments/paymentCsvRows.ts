// Pure row builders for the Dietitian Payment screen's three CSV exports.
//
// These produce the row objects only — `toCsv()` derives the header from
// Object.keys(rows[0]), so the key order below IS the column order and must
// not be reordered. Blob/download stays in paymentCsv.ts; deciding *when* to
// export stays in the page. Nothing here touches the DOM or a store.

import type { Camp } from '@/types/camp.types'
import type { DietPayment, ScopedDietitianRollup } from '@/features/diet/dietitians.types'
import { dietitianExpenseFrom } from '@/features/diet/services/dietitianRates.service'
import {
  bankAccountsForFrom, bankCompleteFrom, type DietitianRollupIndex,
} from '@/features/diet/services/dietitianPayment.service'

export function buildRollupCsvRows(rows: ScopedDietitianRollup[]): Record<string, unknown>[] {
  return rows.map((row) => ({
    Dietitian: row.dietitianName,
    Dietitian_ID: row.dietitianId,
    HQ: row.hq,
    States: row.states.join(', '),
    Total_Camps: row.totalCamps,
    Ready_Camps: row.readyCamps,
    Paid_Camps: row.paidCamps,
    Reports_Pending: row.pendingReports,
    Ready_For_Payment_INR: row.toBePaid,
    Upcoming_INR: row.upcomingAmount,
    Already_Paid_INR: row.paidAmount,
    Bank_Complete: row.bankComplete ? 'YES' : 'NO',
    Printing_Charge_INR: row.printingCharge,
  }))
}

export function buildLedgerCsvRows(list: DietPayment[]): Record<string, unknown>[] {
  return list.map((p) => ({
    Payment_ID: p.id,
    Date: p.paidOn,
    Dietitian: p.dietitianName,
    Dietitian_ID: p.dietitianId,
    Amount_INR: p.amount,
    Mode: p.mode,
    Reference: p.ref,
    Camps: p.campIds.join('|'),
    By: p.paidBy,
    Notes: p.notes,
  }))
}

/**
 * Payment-ready export: one row per READY camp, pre-shaped as the blank
 * template finance fills in and re-imports through the reconciliation flow
 * (hence the trailing empty columns).
 *
 * Takes the caller's already-built DietitianRollupIndex so the whole export
 * costs one store parse — the Phase 1 optimisation, preserved.
 */
export function buildPaymentReadyCsvRows(readyCamps: Camp[], ix: DietitianRollupIndex): Record<string, unknown>[] {
  return readyCamps.map((c) => {
    const e = dietitianExpenseFrom(c, ix)
    const d = ix.rosterById.get(c.dietitianId!)
    // dietBank() picks the first account that actually has an accountNumber,
    // not just array index 0 — dietitian-payment.js:797.
    const accts = bankAccountsForFrom(c.dietitianId!, ix)
    const acct = accts.find((a) => a.accountNumber) ?? accts[0]
    return {
      Camp_ID: c.id,
      Dietitian: d?.name ?? c.dietitianId,
      Dietitian_ID: c.dietitianId,
      Project_ID: c.projectId ?? '',
      City: c.city,
      Camp_Date: c.date,
      Base_INR: e.base,
      TA_INR: e.ta,
      Printing_INR: e.printing,
      Payable_INR: e.total,
      Bank_Account: acct?.accountNumber ?? '',
      Bank_IFSC: acct?.ifsc ?? '',
      Bank_Status: bankCompleteFrom(c.dietitianId!, ix) ? 'COMPLETE' : 'MISSING',
      Payment_Status: '',
      Paid_Amount_INR: '',
      Payment_Date: '',
      Payment_Mode: '',
      UTR_Reference: '',
      Finance_Remarks: '',
    }
  })
}
