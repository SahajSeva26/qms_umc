// Dietitian payments — the payout ledger, the per-camp payment-status gate
// (PENDING → READY → PAID), and the per-dietitian rollup.
//
// Owns KEYS.PAYMENTS.
// TODO: mock/localStorage-backed — swap bodies for api.* when available.

import type { Camp } from '@/features/camps/camp.types'
import type {
  DietPayment, CampPaymentStatus, DietitianPaymentRollup, DietitianDetails,
  DietitianBankAccount, DietitianRateEntry, DietitianRosterEntry,
} from '@/features/diet/dietitians.types'
import { KEYS, load, persist, arr } from './dietStorage'
import {
  dietitianById, dietitianRoster, bankComplete,
  loadDietDetails, isBankAccountComplete,
} from './dietitianRoster.service'
import { dietitianExpense, dietitianExpenseFrom, loadRateHistory } from './dietitianRates.service'

function loadPayments(): DietPayment[] {
  return load(KEYS.PAYMENTS, [] as DietPayment[])
}

export async function getPayments(): Promise<DietPayment[]> {
  return loadPayments()
}

export async function addDietPayment(payload: Omit<DietPayment, 'id' | 'paidAt'> & { id?: string }): Promise<DietPayment> {
  const list = loadPayments()
  const entry: DietPayment = {
    id: payload.id ?? `DP-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e3).toString(36)}`,
    paidAt: new Date().toISOString(),
    ...payload,
  }
  entry.amount = Number(entry.amount || 0)
  persist(KEYS.PAYMENTS, [entry, ...list])
  return entry
}

// ── Payment status gate (PENDING → READY → PAID) ─────────────────────────

export function isReportComplete(camp: Camp): boolean {
  const hasPatients = Number(camp.patientCount || camp.patientsDone || 0) > 0
  const hasPhotos = (Array.isArray(camp.photos) && camp.photos.length > 0)
    || (Array.isArray(camp.submissionData?.photos) && (camp.submissionData?.photos.length ?? 0) > 0)
  return Boolean(camp.submissionCompleted || (hasPatients && hasPhotos))
}

export function paymentsForCamp(campId: string): DietPayment[] {
  return loadPayments().filter((p) => p.campIds.includes(campId))
}

export function paymentsByDietitian(dietitianId: string): DietPayment[] {
  return loadPayments().filter((p) => p.dietitianId === dietitianId)
}

// ── Batch rollup index ───────────────────────────────────────────────────
//
// The per-camp helpers each re-read their backing store on every call, which
// is fine for one-off lookups but degenerates into an N+1 of full reads +
// JSON.parse when a caller loops dietitians × camps.
//
// loadRollupIndex() parses each store ONCE and returns O(1) lookups; the
// *From() variants take that index. Single-shot exports delegate to the same
// implementations, so the batch and one-off paths can never drift apart.
//
// Snapshot semantics: an index is a point-in-time copy. Do NOT reuse one
// across a mutation (addDietPayment etc.) — take a fresh index after writes.

export interface DietitianRollupIndex {
  detailsById: Record<string, DietitianDetails>
  ratesById: Record<string, DietitianRateEntry[]>
  rosterById: Map<string, DietitianRosterEntry>
  payments: DietPayment[]
  /** every campId referenced by any ledger entry — powers the PAID check in O(1) */
  paidCampIds: Set<string>
  paymentsByDietitianId: Map<string, DietPayment[]>
}

export function loadRollupIndex(): DietitianRollupIndex {
  const detailsById = loadDietDetails()
  const ratesById = loadRateHistory()
  const payments = loadPayments()

  const rosterById = new Map<string, DietitianRosterEntry>()
  dietitianRoster().forEach((d) => rosterById.set(d.id, d))

  const paidCampIds = new Set<string>()
  const paymentsByDietitianId = new Map<string, DietPayment[]>()
  payments.forEach((p) => {
    p.campIds.forEach((id) => paidCampIds.add(id))
    const list = paymentsByDietitianId.get(p.dietitianId)
    if (list) list.push(p)
    else paymentsByDietitianId.set(p.dietitianId, [p])
  })

  return { detailsById, ratesById, rosterById, payments, paidCampIds, paymentsByDietitianId }
}

export function dietitianDetailsFrom(id: string, ix: DietitianRollupIndex): DietitianDetails {
  return ix.detailsById[id] ?? { bankAccounts: [] }
}

export function bankAccountsForFrom(id: string, ix: DietitianRollupIndex): DietitianBankAccount[] {
  return arr(dietitianDetailsFrom(id, ix).bankAccounts)
}

export function bankCompleteFrom(id: string, ix: DietitianRollupIndex): boolean {
  return isBankAccountComplete(bankAccountsForFrom(id, ix))
}

export function getLastDietitianRatesFrom(id: string, ix: DietitianRollupIndex): DietitianRateEntry | null {
  const h = ix.ratesById[id] ?? []
  return h.length ? h[0] : null
}

// Same PAID > READY > PENDING precedence as campPaymentStatus(); the
// `paymentsForCamp(id).length` test becomes an O(1) Set hit.
export function campPaymentStatusFrom(camp: Camp, ix: DietitianRollupIndex): CampPaymentStatus | null {
  if (camp.type !== 'Diet') return null
  if (ix.paidCampIds.has(camp.id)) return 'PAID'
  if (isReportComplete(camp)) return 'READY'
  return 'PENDING'
}

export function paymentsByDietitianFrom(dietitianId: string, ix: DietitianRollupIndex): DietPayment[] {
  return ix.paymentsByDietitianId.get(dietitianId) ?? []
}

// campPaymentStatus() — PAID (ledger entry exists) takes priority over READY
// (report complete) takes priority over PENDING (default). om-data.js:869-874.
// Delegates to the indexed variant so the precedence rule has exactly one
// implementation shared with the batch rollup path.
export function campPaymentStatus(camp: Camp): CampPaymentStatus | null {
  return campPaymentStatusFrom(camp, loadRollupIndex())
}

// dietitianPaymentRollup() — per-dietitian aggregate across ALL their Diet
// camps (unscoped by coordinator — Dietitian Profiles' own KPI source).
// om-data.js:878-902.
export function dietitianPaymentRollup(dietitianId: string, camps: Camp[]): DietitianPaymentRollup {
  const d = dietitianById(dietitianId)
  const myCamps = camps.filter((c) => c.type === 'Diet' && c.dietitianId === dietitianId && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED')
  let completedCamps = 0, reportPendingCamps = 0, eligibleAmount = 0, upcomingAmount = 0
  myCamps.forEach((c) => {
    const e = dietitianExpense(c)
    const st = campPaymentStatus(c)
    if (st === 'READY') { eligibleAmount += e.total; completedCamps++ }
    if (st === 'PAID') completedCamps++
    if (st === 'PENDING') { upcomingAmount += e.total; reportPendingCamps++ }
  })
  const paidAmount = paymentsByDietitian(dietitianId).reduce((s, p) => s + Number(p.amount || 0), 0)
  return {
    dietitianId, dietitianName: d?.name ?? dietitianId,
    totalCamps: myCamps.length, completedCamps, reportPendingCamps,
    eligibleAmount, upcomingAmount, paidAmount, toBePaid: Math.max(0, eligibleAmount),
    bankComplete: bankComplete(dietitianId),
  }
}

/** Indexed twin of dietitianPaymentRollup — same numbers, one store parse. */
export function dietitianPaymentRollupFrom(dietitianId: string, camps: Camp[], ix: DietitianRollupIndex): DietitianPaymentRollup {
  const d = ix.rosterById.get(dietitianId)
  const myCamps = camps.filter((c) => c.type === 'Diet' && c.dietitianId === dietitianId && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED')
  let completedCamps = 0, reportPendingCamps = 0, eligibleAmount = 0, upcomingAmount = 0
  myCamps.forEach((c) => {
    const e = dietitianExpenseFrom(c, ix)
    const st = campPaymentStatusFrom(c, ix)
    if (st === 'READY') { eligibleAmount += e.total; completedCamps++ }
    if (st === 'PAID') completedCamps++
    if (st === 'PENDING') { upcomingAmount += e.total; reportPendingCamps++ }
  })
  const paidAmount = paymentsByDietitianFrom(dietitianId, ix).reduce((s, p) => s + Number(p.amount || 0), 0)
  return {
    dietitianId, dietitianName: d?.name ?? dietitianId,
    totalCamps: myCamps.length, completedCamps, reportPendingCamps,
    eligibleAmount, upcomingAmount, paidAmount, toBePaid: Math.max(0, eligibleAmount),
    bankComplete: bankCompleteFrom(dietitianId, ix),
  }
}
