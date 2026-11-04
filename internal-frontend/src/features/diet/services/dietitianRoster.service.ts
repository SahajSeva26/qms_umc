// Dietitian master record — the roster (real people + local enrolments), the
// enrolment/interview pipeline, and the per-dietitian details overlay
// (bank accounts, printing charge, target cost).
//
// Owns two stores: KEYS.ENROLL and KEYS.DETAILS. They live together because
// onboarding completeness spans both (a dietitian isn't onboarded until they
// have a resume, a device alignment AND a bank account).
//
// TODO: mock/localStorage-backed. Replacing this with the real API means
// swapping the bodies below for api.* calls — no consumer changes.

import { PEOPLE } from '@/types/people.mock'
import type {
  DietitianRosterEntry, DietitianDetails, DietitianBankAccount, DietitianEnrollStatus,
} from '@/features/diet/dietitians.types'
import { KEYS, load, persist, arr } from './dietStorage'

// ── Roster ──────────────────────────────────────────────────────────────

function realDietitians(): DietitianRosterEntry[] {
  return PEOPLE.filter((p) => p.role === 'Dietitian').map((d) => ({
    id: d.id,
    real: true,
    name: d.name,
    phone: d.phone,
    email: d.email,
    hq: d.hq,
    states: d.states,
    specialty: d.specialty,
    ratePerCamp: d.ratePerCamp ?? 3000,
    status: 'ENROLLED' as DietitianEnrollStatus,
    detailsComplete: true,
    appliedOn: d.joined,
    joinedOn: d.joined,
  }))
}

const SEED_ENROLL: DietitianRosterEntry[] = [
  {
    id: 'diet-enr-01', real: false, name: 'Ishaan Kapoor', phone: '+91 9845077007', email: 'ishaan.kapoor@qms.health',
    hq: 'Bengaluru', states: ['KA'], specialty: 'Renal Nutrition', ratePerCamp: 2500, status: 'SUBMITTED',
    detailsComplete: true, appliedOn: '2026-06-20', pan: 'AAAPI1234K', address: 'Koramangala, Bengaluru',
    resumeUrl: '/resumes/ishaan-kapoor.pdf', deviceAlignment: ['BCA', 'BMI'],
    interview: { scheduledAt: '2026-07-25T11:00:00', conductedAt: null, by: '', outcome: '', notes: '' },
  },
]

function loadDietEnroll(): DietitianRosterEntry[] {
  return load(KEYS.ENROLL, SEED_ENROLL)
}

function persistDietEnroll(list: DietitianRosterEntry[]) {
  persist(KEYS.ENROLL, list)
}

// dietitianRoster() — realDietitians() ++ loadDietEnroll(), om-data.js:236.
export function dietitianRoster(): DietitianRosterEntry[] {
  return realDietitians().concat(loadDietEnroll())
}

/** Async read boundary — what a future `GET /dietitians` maps onto. */
export async function getDietitianRoster(): Promise<DietitianRosterEntry[]> {
  return dietitianRoster()
}

export function dietitianById(id: string): DietitianRosterEntry | undefined {
  return dietitianRoster().find((d) => d.id === id)
}

export function dietitianName(id: string): string {
  return dietitianById(id)?.name ?? id
}

// dietitianApproved() — real roster dietitians bypass the pipeline entirely;
// locally-enrolled ones must have cleared the OM·Diet interview. om-data.js:282-287.
export function dietitianApproved(id: string): boolean {
  const d = dietitianById(id)
  if (!d) return false
  if (d.real) return true
  return d.status === 'APPROVED'
}

export function dietitianOnboardingComplete(id: string): boolean {
  const d = dietitianById(id)
  if (!d) return false
  if (d.real) return true
  return arr(d.deviceAlignment).length >= 1 && !!(d.resumeUrl || '').trim() && bankAccountsFor(id).length >= 1
}

export async function addDietitianEnrollment(payload: {
  name: string; specialty?: string; phone?: string; email?: string; hq?: string; states?: string[]
  ratePerCamp?: number; pan?: string; address?: string
  bankAccounts?: DietitianBankAccount[]; resumeUrl?: string; deviceAlignment?: string[]
}): Promise<DietitianRosterEntry> {
  const list = loadDietEnroll()
  const rec: DietitianRosterEntry = {
    id: `diet-enr-${Date.now().toString(36)}`,
    real: false,
    name: payload.name,
    specialty: payload.specialty || 'Clinical nutrition',
    phone: payload.phone || '',
    email: payload.email || '',
    hq: payload.hq || '',
    states: payload.states || [],
    ratePerCamp: Math.max(0, payload.ratePerCamp ?? 3000),
    pan: payload.pan || '',
    address: payload.address || '',
    resumeUrl: payload.resumeUrl || '',
    deviceAlignment: payload.deviceAlignment || [],
    status: 'PENDING',
    detailsComplete: false,
    appliedOn: new Date().toISOString().slice(0, 10),
    interview: { scheduledAt: null, conductedAt: null, by: '', outcome: '', notes: '' },
    approvedBy: '', approvedAt: '', rejectedReason: '',
  }
  const next = [...list, rec]
  persistDietEnroll(next)
  if (payload.bankAccounts?.length) {
    await updateDietitianDetails(rec.id, { bankAccounts: payload.bankAccounts })
  }
  return rec
}

export async function setDietitianResume(id: string, resumeUrl: string): Promise<DietitianRosterEntry[]> {
  const next = loadDietEnroll().map((d) => (d.id === id ? { ...d, resumeUrl } : d))
  persistDietEnroll(next)
  return next
}

export async function setDietitianDeviceAlignment(id: string, deviceAlignment: string[]): Promise<DietitianRosterEntry[]> {
  const next = loadDietEnroll().map((d) => (d.id === id ? { ...d, deviceAlignment } : d))
  persistDietEnroll(next)
  return next
}

export async function submitDietitianForInterview(id: string): Promise<DietitianRosterEntry[]> {
  const next = loadDietEnroll().map((d) => (d.id === id ? { ...d, status: 'SUBMITTED' as DietitianEnrollStatus, interview: { ...(d.interview ?? { scheduledAt: null, conductedAt: null, by: '', outcome: '', notes: '' }), scheduledAt: new Date().toISOString() } } : d))
  persistDietEnroll(next)
  return next
}

export async function omInterviewDecision(id: string, outcome: 'APPROVED' | 'REJECTED', by: string, reason?: string): Promise<DietitianRosterEntry[]> {
  const next = loadDietEnroll().map((d) => (d.id === id ? {
    ...d,
    status: outcome,
    approvedBy: outcome === 'APPROVED' ? by : d.approvedBy,
    approvedAt: outcome === 'APPROVED' ? new Date().toISOString() : d.approvedAt,
    rejectedReason: outcome === 'REJECTED' ? (reason || '') : d.rejectedReason,
  } : d))
  persistDietEnroll(next)
  return next
}

// ── Dietitian details overlay (bank / printing / target cost) ───────────

export function loadDietDetails(): Record<string, DietitianDetails> {
  return load(KEYS.DETAILS, {} as Record<string, DietitianDetails>)
}

export function dietitianDetails(id: string): DietitianDetails {
  return loadDietDetails()[id] ?? { bankAccounts: [] }
}

export function bankAccountsFor(id: string): DietitianBankAccount[] {
  return arr(dietitianDetails(id).bankAccounts)
}

// bankComplete — true if ANY one bank account has accountNumber+ifsc+chequeUrl
// all truthy. om-portal.js's dietBank()/rollupForScope() rule (`some`, not `every`).
// The predicate is shared with the indexed variant so both paths agree.
export function isBankAccountComplete(accounts: DietitianBankAccount[]): boolean {
  return accounts.some((b) => !!(b.accountNumber && b.ifsc && b.chequeUrl))
}

export function bankComplete(id: string): boolean {
  return isBankAccountComplete(bankAccountsFor(id))
}

export async function updateDietitianDetails(id: string, patch: Partial<DietitianDetails>): Promise<Record<string, DietitianDetails>> {
  const all = loadDietDetails()
  all[id] = { ...(all[id] ?? { bankAccounts: [] }), ...patch }
  persist(KEYS.DETAILS, all)
  return all
}

export async function addDietitianBank(id: string, account: Omit<DietitianBankAccount, 'capturedAt'>): Promise<Record<string, DietitianDetails>> {
  const all = loadDietDetails()
  const existing = all[id] ?? { bankAccounts: [] }
  all[id] = { ...existing, bankAccounts: [...arr(existing.bankAccounts), { ...account, capturedAt: new Date().toISOString() }] }
  persist(KEYS.DETAILS, all)
  return all
}
