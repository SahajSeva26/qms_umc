import type { Camp } from '@/types/camp.types'
import type { Person } from '@/types/people.types'
import type {
  FoEnrollment, DietitianEnrollment, ExpenseStatus, ExpenseBreakdown, DietitianExpenseBreakdown,
  DietitianRateEntry, DietitianPayment, DietitianInvite, DietitianEquipment, CampFeedback,
  ReopenRequest, OmCampStatus, DietitianRankResult, AuditIssue, PaymentMode, RosterEntry,
  DietitianPaymentDetails, DietitianBankAccount,
} from '@/features/om/om.types'
import { SEED_FO_ENROLL, SEED_DIET_ENROLL } from '@/features/om/om.mock'

// TODO: replace with real API calls once backend endpoints exist.
const KEYS = {
  FO_ENROLL: 'qms.om.foEnroll',
  DIET_ENROLL: 'qms.om.dietEnroll',
  EXPENSES: 'qms.om.expenses',
  DIET_RATES: 'qms.diet.rateHistory',
  DIET_PAYMENTS: 'qms.diet.payments',
  DIET_INVITES: 'qms.diet.invites',
  DIET_EQUIP: 'qms.diet.equipment',
  DIET_FEEDBACK: 'qms.diet.feedback',
  FO_DETAILS: 'qms.om.foDetails',
  DIET_PAYMENT_DETAILS: 'qms.om.dietDetails',
}

function load<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to seed
  }
  return JSON.parse(JSON.stringify(seed))
}
function persist<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* demo persistence only */ }
}

// ── Camp status normalization (campStatus(), om-data.js:86-97) ──────────────
export function campStatus(c: Camp): OmCampStatus {
  if (c.status === 'CLOSED') return 'COMPLETED'
  if (c.status === 'LIVE') return 'ONGOING'
  if (c.status === 'CANCELLED') return 'CANCELLED'
  if (c.status === 'CANCELLED_CHARGED') return 'CANCELLED_CHARGED'
  if (c.status === 'REQUESTED') return 'REQUESTED'
  const today = new Date().toISOString().slice(0, 10)
  if (c.date && c.date < today) return 'OVERDUE'
  if (c.date === today) return 'ONGOING'
  return 'UPCOMING'
}

// campsOfType — mirrors OM.campsOfType(T) (om-data.js) exactly.
export function campsOfType(camps: Camp[], type: 'Screening' | 'Diet'): Camp[] {
  return camps.filter((c) => c.type === type)
}

// isCampUnassigned — mirrors om-portal.js:82-85 exactly.
export function isCampUnassigned(camp: Camp, isDiet: boolean): boolean {
  const subjId = isDiet ? camp.dietitianId : camp.foId
  return !subjId && camp.status !== 'CANCELLED' && camp.status !== 'CANCELLED_CHARGED'
}

// expensesOfType/dietitianExpensesOfType — bulk expense computation over a
// camp set, mirrors om-data.js's expensesOfType()/dietitianExpensesOfType().
export interface ExpenseRow {
  id: string
  campId: string
  clientId: string
  city?: string
  date: string
  foId?: string
  foName?: string
  dietitianId?: string
  dietitianName?: string
  status: ExpenseStatus
  total: number
  // FO breakdown
  travel?: number
  daily?: number
  misc?: number
  // Dietitian breakdown
  base?: number
  travelKm?: number
}

export function expensesOfType(camps: Camp[], overlay: Record<string, ExpenseStatus>, type: 'Screening' | 'Diet', people: Person[]): ExpenseRow[] {
  return camps
    .filter((c) => c.type === type && (c.foId || c.dietitianId))
    .map((c) => {
      const expId = `EXP-${c.id}`
      const exp = campExpense(c)
      const fo = people.find((p) => p.id === c.foId)
      return {
        id: expId, campId: c.id, clientId: c.clientId, city: c.city, date: c.date,
        foId: c.foId, foName: fo?.name ?? c.foId,
        status: expenseStatusFor(overlay, expId), total: exp.total,
        travel: exp.travel, daily: exp.daily, misc: exp.misc,
      }
    })
}

export function dietitianExpensesOfType(camps: Camp[], overlay: Record<string, ExpenseStatus>, history: Record<string, DietitianRateEntry[]>, people: Person[]): ExpenseRow[] {
  return camps
    .filter((c) => c.type === 'Diet' && c.dietitianId)
    .map((c) => {
      const expId = `DEXP-${c.id}`
      const person = people.find((p) => p.id === c.dietitianId)
      const exp = dietitianExpense(c, history[c.dietitianId ?? ''] ?? [], person)
      return {
        id: expId, campId: c.id, clientId: c.clientId, city: c.city, date: c.date,
        dietitianId: c.dietitianId, dietitianName: person?.name ?? c.dietitianId,
        status: expenseStatusFor(overlay, expId), total: exp.total,
        base: exp.base, travel: exp.ta, travelKm: exp.travelKm,
      }
    })
}

// ── Dietitian payments tab — payment-details store (bank accounts + printing
// charge), dietitian-wise + state-wise aggregation. Mirrors tabDietPayments()
// exactly (om-portal.js:1435-1602).
export async function getDietPaymentDetails(): Promise<Record<string, DietitianPaymentDetails>> {
  return load(KEYS.DIET_PAYMENT_DETAILS, {} as Record<string, DietitianPaymentDetails>)
}

export async function saveDietPaymentDetails(dietitianId: string, patch: Partial<DietitianPaymentDetails>): Promise<Record<string, DietitianPaymentDetails>> {
  const all = load(KEYS.DIET_PAYMENT_DETAILS, {} as Record<string, DietitianPaymentDetails>)
  const existing: DietitianPaymentDetails = all[dietitianId] ?? { bankAccounts: [] }
  all[dietitianId] = { ...existing, ...patch }
  persist(KEYS.DIET_PAYMENT_DETAILS, all)
  return all
}

export interface DietitianPaymentRow {
  dietId: string
  name: string
  hq: string
  states: string
  primaryState: string
  camps: number
  total: number
  paid: number
  pending: number
  approved: number
  rejected: number
  claimable: number
  bankAccounts: DietitianBankAccount[]
  bankComplete: boolean
}

export interface StatePaymentRow {
  state: string
  uniqueDietitians: number
  camps: number
  total: number
  paid: number
  claimable: number
}

export function dietitianWisePayments(expenses: ExpenseRow[], dietitians: Person[], details: Record<string, DietitianPaymentDetails>): DietitianPaymentRow[] {
  const byDiet: Record<string, { id: string; name: string; camps: number; total: number; paid: number; pending: number; approved: number; rejected: number }> = {}
  expenses.forEach((e) => {
    const k = e.dietitianId ?? e.dietitianName ?? 'UNKNOWN'
    if (!byDiet[k]) byDiet[k] = { id: k, name: e.dietitianName ?? k, camps: 0, total: 0, paid: 0, pending: 0, approved: 0, rejected: 0 }
    const r = byDiet[k]
    r.camps += 1
    r.total += e.total || 0
    if (e.status === 'PAID') r.paid += e.total || 0
    if (e.status === 'PENDING') r.pending += e.total || 0
    if (e.status === 'APPROVED') r.approved += e.total || 0
    if (e.status === 'REJECTED') r.rejected += e.total || 0
  })
  return Object.values(byDiet)
    .map((r) => {
      const person = dietitians.find((d) => d.id === r.id)
      const det = details[r.id]
      const bankAccounts = det?.bankAccounts ?? []
      const bankComplete = bankAccounts.length > 0 && bankAccounts.every((a) => a.accountNumber && a.ifsc && a.chequeUrl)
      return {
        dietId: r.id, name: r.name, hq: person?.hq ?? '', states: (person?.states ?? []).join(', '),
        primaryState: person?.states?.[0] ?? '', camps: r.camps, total: r.total, paid: r.paid,
        pending: r.pending, approved: r.approved, rejected: r.rejected, claimable: r.total - r.paid,
        bankAccounts, bankComplete,
      }
    })
    .sort((a, b) => b.claimable - a.claimable)
}

export function stateWisePayments(rows: DietitianPaymentRow[]): StatePaymentRow[] {
  const byState: Record<string, { state: string; ids: Set<string>; camps: number; total: number; paid: number; claimable: number }> = {}
  rows.forEach((r) => {
    const s = r.primaryState || '—'
    if (!byState[s]) byState[s] = { state: s, ids: new Set(), camps: 0, total: 0, paid: 0, claimable: 0 }
    const b = byState[s]
    b.ids.add(r.dietId)
    b.camps += r.camps
    b.total += r.total
    b.paid += r.paid
    b.claimable += r.claimable
  })
  return Object.values(byState)
    .map((b) => ({ state: b.state, uniqueDietitians: b.ids.size, camps: b.camps, total: b.total, paid: b.paid, claimable: b.claimable }))
    .sort((a, b) => b.claimable - a.claimable)
}

// FO/dietitian availability — mirrors foAvail() exactly (om-portal.js:270).
export type Availability = 'AT_CAMP' | 'ON_DUTY' | 'IDLE'

export function subjectAvailability(personId: string, todayCamps: Camp[], isDiet: boolean): Availability {
  const subjKey = isDiet ? 'dietitianId' : 'foId'
  const tc = todayCamps.filter((c) => c[subjKey] === personId)
  if (tc.length === 0) return 'IDLE'
  return tc.some((c) => campStatus(c) === 'ONGOING') ? 'AT_CAMP' : 'ON_DUTY'
}

// ── FO enrollment pipeline ───────────────────────────────────────────────────
export async function getFoEnrollments(): Promise<FoEnrollment[]> {
  return load(KEYS.FO_ENROLL, SEED_FO_ENROLL)
}

export async function addFoEnrollment(payload: { name: string; phone: string; email: string; hq: string; states: string[] }): Promise<FoEnrollment[]> {
  const list = load(KEYS.FO_ENROLL, SEED_FO_ENROLL)
  const next = [...list, { id: `enr-fo-${Date.now().toString().slice(-6)}`, ...payload, appliedOn: new Date().toISOString().slice(0, 10), detailsComplete: false, status: 'PENDING' as const }]
  persist(KEYS.FO_ENROLL, next)
  return next
}

export async function saveFoDetails(id: string, patch: Partial<FoEnrollment>): Promise<FoEnrollment[]> {
  const list = load(KEYS.FO_ENROLL, SEED_FO_ENROLL)
  const next = list.map((f) => {
    if (f.id !== id) return f
    const merged = { ...f, ...patch }
    const detailsComplete = !!(merged.phone && merged.email && merged.hq && merged.address)
    return { ...merged, detailsComplete }
  })
  persist(KEYS.FO_ENROLL, next)
  return next
}

export async function approveFoEnroll(id: string): Promise<{ ok: boolean; list: FoEnrollment[] }> {
  const list = load(KEYS.FO_ENROLL, SEED_FO_ENROLL)
  const target = list.find((f) => f.id === id)
  if (!target || !target.detailsComplete) return { ok: false, list }
  const next = list.map((f) => (f.id === id ? { ...f, status: 'ENROLLED' as const, joinedOn: new Date().toISOString().slice(0, 10) } : f))
  persist(KEYS.FO_ENROLL, next)
  return { ok: true, list: next }
}

export async function rejectFoEnroll(id: string): Promise<FoEnrollment[]> {
  const list = load(KEYS.FO_ENROLL, SEED_FO_ENROLL)
  const next = list.map((f) => (f.id === id ? { ...f, status: 'REJECTED' as const } : f))
  persist(KEYS.FO_ENROLL, next)
  return next
}

// ── Dietitian enrollment pipeline ────────────────────────────────────────────
export async function getDietEnrollments(): Promise<DietitianEnrollment[]> {
  return load(KEYS.DIET_ENROLL, SEED_DIET_ENROLL)
}

export async function addDietEnrollment(payload: { name: string; phone: string; email: string; hq: string; states: string[]; specialty?: string; ratePerCamp?: number }): Promise<DietitianEnrollment[]> {
  const list = load(KEYS.DIET_ENROLL, SEED_DIET_ENROLL)
  const next: DietitianEnrollment[] = [...list, {
    id: `enr-dt-${Date.now().toString().slice(-6)}`, ...payload,
    appliedOn: new Date().toISOString().slice(0, 10), detailsComplete: false,
    bankAccounts: [], resumeUrl: '', deviceAlignment: [], status: 'PENDING',
  }]
  persist(KEYS.DIET_ENROLL, next)
  return next
}

export async function saveDietDetails(id: string, patch: Partial<DietitianEnrollment>): Promise<DietitianEnrollment[]> {
  const list = load(KEYS.DIET_ENROLL, SEED_DIET_ENROLL)
  const next = list.map((d) => {
    if (d.id !== id) return d
    const merged = { ...d, ...patch }
    const detailsComplete = !!(merged.phone && merged.email && merged.hq && merged.address)
    return { ...merged, detailsComplete }
  })
  persist(KEYS.DIET_ENROLL, next)
  return next
}

function dietitianOnboardingComplete(d: DietitianEnrollment): boolean {
  return d.bankAccounts.length >= 1 && d.resumeUrl.trim() !== '' && d.deviceAlignment.length >= 1
}

export async function submitDietitianForInterview(id: string): Promise<{ ok: boolean; list: DietitianEnrollment[] }> {
  const list = load(KEYS.DIET_ENROLL, SEED_DIET_ENROLL)
  const target = list.find((d) => d.id === id)
  if (!target || !dietitianOnboardingComplete(target)) return { ok: false, list }
  const next = list.map((d) => (d.id === id ? { ...d, status: 'SUBMITTED' as const, interview: { ...d.interview, scheduledAt: d.interview?.scheduledAt ?? new Date().toISOString() } } : d))
  persist(KEYS.DIET_ENROLL, next)
  return { ok: true, list: next }
}

export async function omInterviewDecision(id: string, outcome: 'APPROVED' | 'REJECTED', notes: string, by: string): Promise<DietitianEnrollment[]> {
  const list = load(KEYS.DIET_ENROLL, SEED_DIET_ENROLL)
  const next = list.map((d) => {
    if (d.id !== id) return d
    if (outcome === 'APPROVED') {
      return { ...d, status: 'APPROVED' as const, approvedBy: by, approvedAt: new Date().toISOString(), rejectedReason: undefined, interview: { ...d.interview, conductedAt: new Date().toISOString(), by, outcome, notes } }
    }
    return { ...d, status: 'REJECTED' as const, rejectedReason: notes, interview: { ...d.interview, conductedAt: new Date().toISOString(), by, outcome, notes } }
  })
  persist(KEYS.DIET_ENROLL, next)
  return next
}

export function dietitianApproved(d: DietitianEnrollment | Person): boolean {
  if ('real' in d && d.real) return true
  if ('status' in d) return d.status === 'APPROVED'
  return true // Person (real roster) records are always approved
}

// ── Unified roster (real staff + pipeline enrollments) ──────────────────────
// Mirrors foRoster()/dietitianRoster() exactly (om-data.js:154/236) — real
// staff (from the shared People master) always ENROLLED/detailsComplete,
// concatenated with the OM-owned pipeline. A per-person "details" overlay
// (phone/email/hq) lets OM update a real staffer's contact info without
// touching the People master itself (om-data.js:139: `d.phone || p.phone`).
export interface FoDetailsOverlay {
  phone?: string
  email?: string
  hq?: string
  pan?: string
  aadhar?: string
  address?: string
}

function realFoToRoster(p: Person, overlay: FoDetailsOverlay | undefined): RosterEntry {
  return {
    id: p.id, real: true, name: p.name,
    phone: overlay?.phone || p.phone || '', email: overlay?.email || p.email || '',
    hq: overlay?.hq || p.hq || '', states: p.states,
    status: 'ENROLLED', detailsComplete: true,
    appliedOn: p.joined || '', joinedOn: p.joined || '',
    pan: overlay?.pan, aadhar: overlay?.aadhar, address: overlay?.address,
    salaryInr: p.salaryInr, campsPerDay: p.campsPerDay ?? 2,
    machinesAssigned: p.machinesAssigned, occupancyPct: p.occupancyPct, efficiencyPct: p.efficiencyPct, feedbackAvg: p.feedbackAvg,
  }
}

function realDietitianToRoster(p: Person, overlay: FoDetailsOverlay | undefined): RosterEntry {
  return {
    id: p.id, real: true, name: p.name,
    phone: overlay?.phone || p.phone || '', email: overlay?.email || p.email || '',
    hq: overlay?.hq || p.hq || '', states: p.states,
    specialty: p.specialty || 'Clinical nutrition',
    status: 'ENROLLED', detailsComplete: true,
    appliedOn: p.joined || '', joinedOn: p.joined || '',
    ratePerCamp: p.ratePerCamp || 3000,
    pan: overlay?.pan, aadhar: overlay?.aadhar, address: overlay?.address,
  }
}

function enrollmentToRoster(f: FoEnrollment | DietitianEnrollment): RosterEntry {
  return {
    id: f.id, real: false, name: f.name, phone: f.phone, email: f.email, hq: f.hq, states: f.states,
    status: f.status, detailsComplete: f.detailsComplete, appliedOn: f.appliedOn, joinedOn: f.joinedOn,
    pan: f.pan, aadhar: f.aadhar, address: f.address,
    specialty: 'specialty' in f ? f.specialty : undefined,
    ratePerCamp: 'ratePerCamp' in f ? f.ratePerCamp : undefined,
  }
}

export function foRoster(fos: Person[], enrollments: FoEnrollment[], detailsOverlay: Record<string, FoDetailsOverlay>): RosterEntry[] {
  return [...fos.map((p) => realFoToRoster(p, detailsOverlay[p.id])), ...enrollments.map(enrollmentToRoster)]
}

export function dietitianRoster(dietitians: Person[], enrollments: DietitianEnrollment[], detailsOverlay: Record<string, FoDetailsOverlay>): RosterEntry[] {
  return [...dietitians.map((p) => realDietitianToRoster(p, detailsOverlay[p.id])), ...enrollments.map(enrollmentToRoster)]
}

export async function getFoDetailsOverlay(): Promise<Record<string, FoDetailsOverlay>> {
  return load(KEYS.FO_DETAILS, {} as Record<string, FoDetailsOverlay>)
}

// updateFoDetails/updateDietitianDetails — patches the per-person details
// overlay for REAL staff only (om-data.js's patchRealDetails path); pipeline
// applicants use saveFoDetails/saveDietDetails instead (already in this file).
export async function saveRealPersonDetails(personId: string, patch: FoDetailsOverlay): Promise<Record<string, FoDetailsOverlay>> {
  const overlay = load(KEYS.FO_DETAILS, {} as Record<string, FoDetailsOverlay>)
  overlay[personId] = { ...overlay[personId], ...patch }
  persist(KEYS.FO_DETAILS, overlay)
  return overlay
}

// ── Dietitian ranking algorithm (rankDietitiansForCamp, om-data.js:547-566) ──
export function rankDietitiansForCamp(camp: Camp, dietitians: Person[], closedDietCamps: Camp[]): DietitianRankResult[] {
  return dietitians.map((d) => {
    let score = 0
    const reasons: string[] = []
    const dCity = (d.city ?? d.hq ?? '').toLowerCase().trim()
    const cCity = camp.city.toLowerCase().trim()
    if (dCity && cCity && dCity === cCity) { score -= 100; reasons.push('Nearest — same city') }
    else if (dCity && cCity) { score -= 10; reasons.push('Different city') }

    const lastFeedbackCamp = closedDietCamps
      .filter((c) => c.dietitianId === d.id && c.rating?.overall)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    if (lastFeedbackCamp?.rating?.overall) {
      if (lastFeedbackCamp.rating.overall >= 4) { score -= 50; reasons.push('Positive last feedback') }
      else { score += 20; reasons.push('Last feedback below threshold') }
    } else {
      reasons.push('No prior camp history')
    }
    return { dietitianId: d.id, score, reasons }
  }).sort((a, b) => a.score - b.score)
}

// campRequiresBca — regex-matches tests for BCA/body-composition mention.
export function campRequiresBca(camp: Camp): boolean {
  const haystack = `${(camp as unknown as { tests?: string[] }).tests?.join(' ') ?? ''} ${(camp as unknown as { testsConducted?: string[] }).testsConducted?.join(' ') ?? ''}`
  return /\bBCA\b|body\s*comp|composition|fat\s*analys/i.test(haystack)
}

// ── Dietitian rate history + suggestion ─────────────────────────────────────
export async function getRateHistory(dietitianId: string): Promise<DietitianRateEntry[]> {
  const all = load(KEYS.DIET_RATES, {} as Record<string, DietitianRateEntry[]>)
  return all[dietitianId] ?? []
}

export async function getAllRateHistory(): Promise<Record<string, DietitianRateEntry[]>> {
  return load(KEYS.DIET_RATES, {} as Record<string, DietitianRateEntry[]>)
}

// Records the rate-history entry (OM-owned store) and returns the
// Partial<Camp> patch the caller must persist via the shared useCampsData
// hook's patchCamp mutation — this module never writes qms.master.camps
// directly (features/camps/ is its sole owner).
export async function recordDietitianRates(dietitianId: string, campId: string, rates: { remuneration: number; ta: number; printing: number }, reason: string, by: string): Promise<Partial<Camp>> {
  const all = load(KEYS.DIET_RATES, {} as Record<string, DietitianRateEntry[]>)
  const entry: DietitianRateEntry = { ...rates, targetCost: rates.remuneration + rates.ta + rates.printing, reason, setAt: new Date().toISOString(), setBy: by, campId }
  all[dietitianId] = [entry, ...(all[dietitianId] ?? [])].slice(0, 50)
  persist(KEYS.DIET_RATES, all)

  return { dietitianRates: rates, taAmount: rates.ta } as Partial<Camp>
}

export function suggestDietitianRates(history: DietitianRateEntry[], person: Person | undefined, travelKm: number): { remuneration: number; ta: number; printing: number } {
  const last = history[0]
  const remuneration = last?.remuneration ?? person?.ratePerCamp ?? Math.round(2500 + Math.random() * 1500)
  const ta = last?.ta ?? Math.round(travelKm * 9)
  const printing = last?.printing ?? person?.printingChargePerCamp ?? 150
  return { remuneration, ta, printing }
}

export function dietitianExpense(camp: Camp, history: DietitianRateEntry[], person: Person | undefined): DietitianExpenseBreakdown {
  const dietitianRates = (camp as unknown as { dietitianRates?: { remuneration?: number; ta?: number; printing?: number } }).dietitianRates
  const taAmount = (camp as unknown as { taAmount?: number }).taAmount
  const travelKm = Math.round((camp as unknown as { foDistanceKm?: number }).foDistanceKm ?? 8 + Math.random() * 50)
  const last = history[0]
  const firstFinite = (...vals: (number | undefined)[]) => vals.find((v) => typeof v === 'number' && !isNaN(v)) ?? 0

  const base = firstFinite(dietitianRates?.remuneration, last?.remuneration, person?.ratePerCamp, Math.round(2500 + Math.random() * 1500))
  const ta = firstFinite(dietitianRates?.ta, taAmount, last?.ta, Math.round(travelKm * 9))
  const printing = firstFinite(dietitianRates?.printing, last?.printing, person?.printingChargePerCamp, 150)
  return { base, ta, printing, travelKm, total: base + ta + printing }
}

// ── FO/general expense computation + approval ────────────────────────────────
function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i)
  return () => { h = (h * 9301 + 49297) % 233280; return h / 233280 }
}

export function campExpense(camp: Camp): ExpenseBreakdown {
  const rng = seededRandom(camp.id)
  const distanceKm = (camp as unknown as { foDistanceKm?: number }).foDistanceKm ?? 8 + rng() * 64
  const travel = Math.round(distanceKm * 12) + Math.round(rng() * 120)
  const daily = camp.type === 'Diet' ? 450 : 500
  const misc = Math.round(rng() * 350)
  return { travel, daily, misc, total: travel + daily + misc, distanceKm }
}

function defaultExpenseStatus(expId: string): ExpenseStatus {
  const rng = seededRandom(expId)()
  if (rng < 0.55) return 'PENDING'
  if (rng < 0.82) return 'APPROVED'
  return 'PAID'
}

export async function getExpenseOverlay(): Promise<Record<string, ExpenseStatus>> {
  return load(KEYS.EXPENSES, {} as Record<string, ExpenseStatus>)
}

export function expenseStatusFor(overlay: Record<string, ExpenseStatus>, expId: string): ExpenseStatus {
  return overlay[expId] ?? defaultExpenseStatus(expId)
}

export async function setExpenseStatus(expId: string, status: ExpenseStatus): Promise<Record<string, ExpenseStatus>> {
  const overlay = load(KEYS.EXPENSES, {} as Record<string, ExpenseStatus>)
  overlay[expId] = status
  persist(KEYS.EXPENSES, overlay)
  return overlay
}

// ── Dietitian payment ledger ─────────────────────────────────────────────────
export async function getDietPayments(): Promise<DietitianPayment[]> {
  return load(KEYS.DIET_PAYMENTS, [] as DietitianPayment[])
}

export async function addDietPayment(payload: { paidBy: string; mode: PaymentMode; ref: string; campIds: string[]; notes: string; amount: number }): Promise<DietitianPayment[]> {
  const list = load(KEYS.DIET_PAYMENTS, [] as DietitianPayment[])
  const now = new Date().toISOString()
  const next = [...list, { id: `PAY-${Date.now().toString().slice(-6)}`, paidOn: now.slice(0, 10), paidAt: now, ...payload }]
  persist(KEYS.DIET_PAYMENTS, next)
  return next
}

export function isReportComplete(camp: Camp): boolean {
  const submissionData = (camp as unknown as { submissionData?: { photos?: string[] } }).submissionData
  if (camp.submissionCompleted) return true
  const patientCount = camp.patientCount ?? 0
  const photos = camp.photos ?? submissionData?.photos ?? []
  return patientCount > 0 && photos.length > 0
}

export function campPaymentStatus(camp: Camp, payments: DietitianPayment[]): 'PAID' | 'READY' | 'PENDING' {
  if (payments.some((p) => p.campIds.includes(camp.id))) return 'PAID'
  return isReportComplete(camp) ? 'READY' : 'PENDING'
}

export function dietitianPaymentRollup(dietitianId: string, camps: Camp[], payments: DietitianPayment[], history: Record<string, DietitianRateEntry[]>, person: Person | undefined) {
  const dCamps = camps.filter((c) => c.dietitianId === dietitianId && c.type === 'Diet' && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED')
  let eligibleAmount = 0, upcomingAmount = 0, paidAmount = 0, reportPendingCamps = 0
  for (const c of dCamps) {
    const status = campPaymentStatus(c, payments)
    const exp = dietitianExpense(c, history[dietitianId] ?? [], person)
    if (status === 'PAID') paidAmount += exp.total
    else if (status === 'READY') eligibleAmount += exp.total
    else { upcomingAmount += exp.total; reportPendingCamps++ }
  }
  return { eligibleAmount, upcomingAmount, paidAmount, reportPendingCamps, toBePaid: Math.max(0, eligibleAmount), campCount: dCamps.length }
}

// ── Dietitian invites ─────────────────────────────────────────────────────────
export async function getInvites(): Promise<Record<string, DietitianInvite[]>> {
  return load(KEYS.DIET_INVITES, {} as Record<string, DietitianInvite[]>)
}

export async function addInvite(campId: string, invite: DietitianInvite): Promise<Record<string, DietitianInvite[]>> {
  const all = load(KEYS.DIET_INVITES, {} as Record<string, DietitianInvite[]>)
  all[campId] = [...(all[campId] ?? []), invite]
  persist(KEYS.DIET_INVITES, all)
  return all
}

// ── Dietitian equipment / BCA ─────────────────────────────────────────────────
export async function getEquipment(): Promise<Record<string, DietitianEquipment>> {
  return load(KEYS.DIET_EQUIP, {} as Record<string, DietitianEquipment>)
}

// ── Camp feedback ─────────────────────────────────────────────────────────────
export async function getFeedback(): Promise<Record<string, CampFeedback>> {
  return load(KEYS.DIET_FEEDBACK, {} as Record<string, CampFeedback>)
}

// ── Audit ──────────────────────────────────────────────────────────────────────
export function auditIssues(camps: Camp[]): AuditIssue[] {
  return camps
    .map((c) => {
      const status = campStatus(c)
      if (status !== 'COMPLETED' && status !== 'ONGOING' && status !== 'OVERDUE') return null
      const photosMissing = !(c.photos?.length) && !c.photoUrl
      const reportMissing = !((c as unknown as { reports?: string[] }).reports?.length) && !c.consentUrl
      const countMissing = !c.patientCount && !c.patientsDone
      const issueCount = [photosMissing, reportMissing, countMissing].filter(Boolean).length
      return issueCount > 0 ? { campId: c.id, photosMissing, reportMissing, countMissing, issueCount } : null
    })
    .filter((i): i is AuditIssue => i !== null)
}

// ── Camp-level assignment writes (FO/devices/dietitian propose) ─────────────
// These compute a Partial<Camp> patch only — persistence goes through the
// shared useCampsData hook's patchCamp mutation (features/camps/ is the
// sole owner of the qms.master.camps store; this module never reaches into
// features/camps/ or localStorage directly, per CLAUDE.md §3).

// assignFo — mirrors om-data.js:1021-1033: sets foId/foName, auto-promotes
// REQUESTED → CONFIRMED.
export function omAssignFoPatch(camp: Camp | undefined, foId: string, foName: string): Partial<Camp> {
  return { foId, foName, ...(camp?.status === 'REQUESTED' ? { status: 'CONFIRMED' as const } : {}) }
}

export function omAssignDevicesPatch(deviceIds: string[]): Partial<Camp> {
  return { devicesAllocated: deviceIds }
}

// proposeDietitianForCamp — writes camp.dietitianProposal, does NOT assign
// (om-data.js:574-614) — only a Diet Camp Coordinator's assignDietitianByCoord
// (out of OM's own scope) commits the assignment.
export function proposeDietitianForCampPatch(dietitianId: string, dietitianName: string, reasons: string[], score: number, by: string): Partial<Camp> {
  return {
    dietitianProposal: { suggestedDietitianId: dietitianId, suggestedDietitianName: dietitianName, suggestedAt: new Date().toISOString(), suggestedBy: by, reasons, score, status: 'SUGGESTED' },
  }
}

// ── Reopen requests (nested on Camp.reopenRequests, generic overlay) ─────────
export function requestTokenReopenPatch(camp: Camp | undefined, reason: string, by: string): { patch: Partial<Camp>; request: ReopenRequest } {
  const request: ReopenRequest = { id: `RR-${Date.now()}`, reason, requestedAt: new Date().toISOString(), requestedBy: by, status: 'PENDING' }
  const nextReopenRequests = [...((camp as unknown as { reopenRequests?: ReopenRequest[] })?.reopenRequests ?? []), request]
  return { patch: { reopenRequests: nextReopenRequests } as Partial<Camp>, request }
}

// approveTokenReopen/denyTokenReopen — mirrors the prototype's reopen
// decision exactly: approval resets tokenActivatedAt (a fresh 24h window),
// denial only records the decision + reason on the request itself.
export function decideTokenReopenPatch(camp: Camp | undefined, requestId: string, decision: 'APPROVED' | 'DENIED', by: string, denialReason?: string): Partial<Camp> {
  const existing = (camp as unknown as { reopenRequests?: ReopenRequest[] })?.reopenRequests ?? []
  const nextReopenRequests = existing.map((r) =>
    r.id === requestId ? { ...r, status: decision, decidedAt: new Date().toISOString(), decidedBy: by, ...(denialReason ? { denialReason } : {}) } : r
  )
  return {
    reopenRequests: nextReopenRequests,
    ...(decision === 'APPROVED' ? { tokenActivatedAt: new Date().toISOString() } : {}),
  } as Partial<Camp>
}
