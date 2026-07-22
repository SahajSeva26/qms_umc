// Shared dietitian data layer for the 3 previously-stubbed Field Network
// "Dietitians" screens (Diet Coord Workspace, Dietitian Payment, Dietitian
// Profiles). Exact port of the prototype's om-data.js dietitian functions —
// rankDietitiansForCamp, dietitianExpense, campPaymentStatus, BCA equipment,
// invites, rate history, payment ledger, reopen requests. Every formula here
// is transcribed literally from om-data.js (see file:line citations in
// comments) so all 3 screens compute identical numbers for the same camp.
// TODO: entirely mock/frontend-only — no backend endpoints exist yet.

import type { Camp } from '@/types/camp.types'
import { PEOPLE } from '@/types/people.mock'
import { CLIENTS } from '@/types/client.types'
import type { ClientProject } from '@/types/client.types'
import { PROJECTS } from '@/features/crm/clients/clients.mock'
import type {
  DietitianRosterEntry, DietitianDetails, DietitianBankAccount, DietitianBcaEquipment,
  DietitianRateEntry, DietInvite, DietitianFeedback, DietPayment,
  CampReopenRequest, CampPaymentStatus, DietitianExpense, DietitianRankResult,
  DietitianAverageRating, DietitianPaymentRollup, DietitianProjectBreakdown, DietitianProfileBundle,
  DietitianEnrollStatus,
} from '@/features/diet/dietitians.types'

const KEYS = {
  ENROLL: 'qms.om.dietEnroll',
  DETAILS: 'qms.om.dietDetails',
  RATE_HISTORY: 'qms.diet.rateHistory',
  INVITES: 'qms.diet.invites',
  EQUIPMENT: 'qms.diet.equipment',
  FEEDBACK: 'qms.diet.feedback',
  PAYMENTS: 'qms.diet.payments',
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
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // demo persistence only
  }
}

function arr<T>(v: T[] | undefined | null): T[] {
  return Array.isArray(v) ? v : []
}

function num(...candidates: (number | undefined | null)[]): number {
  for (const c of candidates) {
    if (typeof c === 'number' && isFinite(c)) return c
  }
  return 0
}

// Deterministic PRNG keyed by a string seed — exact port of om-data.js's
// seeded()/FNV-1a-ish hash, used so "random" travel/base-rate fallbacks are
// stable across renders for the same camp id.
function seeded(str: string): () => number {
  let s = 2166136261 >>> 0
  const input = String(str || 'x')
  for (let i = 0; i < input.length; i++) {
    s ^= input.charCodeAt(i)
    s = Math.imul(s, 16777619) >>> 0
  }
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function fmtInr(n: number): string {
  n = Number(n) || 0
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr'
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + ' L'
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

// Same tier list as fmtInr but with a Thousands step, used by
// diet-approvals.js's dashboard KPIs (fmtInrLocal).
export function fmtInrCompact(n: number): string {
  n = Number(n) || 0
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr'
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + ' L'
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K'
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

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

export function dietitianById(id: string): DietitianRosterEntry | undefined {
  return dietitianRoster().find((d) => d.id === id)
}

export function dietitianName(id: string): string {
  return dietitianById(id)?.name ?? id
}

export function clientName(id: string): string {
  return CLIENTS.find((c) => c.id === id)?.name ?? id
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

function loadDietDetails(): Record<string, DietitianDetails> {
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
export function bankComplete(id: string): boolean {
  return bankAccountsFor(id).some((b) => !!(b.accountNumber && b.ifsc && b.chequeUrl))
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

// ── Coordinator scoping ───────────────────────────────────────────────────

// Diet Coord Workspace's admin-like set — diet-approvals.js:640-643.
export function isAdminLike(roleId: string): boolean {
  return ['admin', 'super_admin', 'om_diet', 'om_screening'].includes(roleId)
}

// Dietitian Payment's own admin-like set — dietitian-payment.js:53 explicitly
// includes 'accounts' ("everyone (read-only finance view)", per that file's
// own header comment) and does NOT include 'om_screening'. Distinct from the
// Diet Coord Workspace's isAdminLike() above — the two prototype screens
// genuinely define this differently; do not merge them into one list.
export function isPaymentAdminLike(roleId: string): boolean {
  return ['admin', 'super_admin', 'om_diet', 'accounts'].includes(roleId)
}

// resolveCoordinatorId() — matches the logged-in user's name against people
// whose role matches /coordinator|coord/i (case-insensitive), falling back
// to any exact-name match. om-data.js:501-511.
export function resolveCoordinatorId(userName: string): string | null {
  const name = (userName || '').trim().toLowerCase()
  if (!name) return null
  const coordTitled = PEOPLE.find((p) => /coordinator|coord/i.test(p.role) && p.name.trim().toLowerCase() === name)
  if (coordTitled) return coordTitled.id
  const anyMatch = PEOPLE.find((p) => p.name.trim().toLowerCase() === name)
  return anyMatch ? anyMatch.id : null
}

export function isCoordCamp(camp: Camp, coordId: string): boolean {
  if (camp.coordinatorId === coordId || camp.coordId === coordId) return true
  const proj = PROJECTS.find((p) => p.id === camp.projectId)
  return !!proj && proj.coordinatorId === coordId
}

export function coordScopedCamps(camps: Camp[], coordId: string): Camp[] {
  return camps.filter((c) => isCoordCamp(c, coordId))
}

export function coordScopedProjects(coordId: string): ClientProject[] {
  return PROJECTS.filter((p) => p.coordinatorId === coordId)
}

export function coordScopedClients(coordId: string) {
  const projIds = new Set(coordScopedProjects(coordId).map((p) => p.clientId))
  return CLIENTS.filter((c) => projIds.has(c.id))
}

// isDietProject() — pure-Diet or Mixed-with-Diet-subtype. diet-approvals.js's tabProjects().
export function isDietProject(p: ClientProject | undefined | null): boolean {
  if (!p) return false
  return p.type === 'Diet' || (p.type === 'Mixed' && arr(p.mixedSubTypes).includes('Diet'))
}

// ── BCA (Body Composition Analyzer) ──────────────────────────────────────

export function campRequiresBca(camp: Camp): boolean {
  const tests = arr(camp.tests).concat(arr(camp.testsConducted))
  return tests.some((t) => /\bBCA\b|body\s*comp|composition|fat\s*analys/i.test(String(t)))
}

function loadEquipment(): Record<string, DietitianBcaEquipment> {
  return load(KEYS.EQUIPMENT, {} as Record<string, DietitianBcaEquipment>)
}

const DEFAULT_BCA: DietitianBcaEquipment = { owned: false, verified: false, verifiedAt: null, verifiedBy: null, videoUrl: '', stockMovements: [] }

export function getDietitianEquipment(id: string): DietitianBcaEquipment {
  return loadEquipment()[id] ?? { ...DEFAULT_BCA }
}

export function dietitianHasBca(id: string): boolean {
  return getDietitianEquipment(id).owned
}

export function bcaVerified(id: string): boolean {
  return getDietitianEquipment(id).verified
}

function persistEquipment(id: string, eq: DietitianBcaEquipment) {
  const all = loadEquipment()
  all[id] = eq
  persist(KEYS.EQUIPMENT, all)
}

export async function requestBcaScale(id: string, by: string): Promise<DietitianBcaEquipment> {
  const eq = getDietitianEquipment(id)
  const next: DietitianBcaEquipment = {
    ...eq, owned: false, verified: false, requestedAt: new Date().toISOString(), requestedBy: by,
    stockMovements: [{ at: new Date().toISOString(), by, action: 'BCA scale requested · awaiting allocation' }, ...arr(eq.stockMovements)],
  }
  persistEquipment(id, next)
  return next
}

export async function verifyBcaScale(id: string, opts: { videoUrl?: string }, by: string): Promise<DietitianBcaEquipment> {
  const eq = getDietitianEquipment(id)
  const next: DietitianBcaEquipment = {
    ...eq, owned: true, verified: true, verifiedAt: new Date().toISOString(), verifiedBy: by,
    videoUrl: opts.videoUrl || eq.videoUrl,
    stockMovements: [{ at: new Date().toISOString(), by, action: 'BCA scale received + trained · verified', videoUrl: opts.videoUrl }, ...arr(eq.stockMovements)],
  }
  persistEquipment(id, next)
  return next
}

export async function logStockMovement(id: string, entry: { action: string; fromLocation?: string; toLocation?: string }, by: string): Promise<DietitianBcaEquipment> {
  const eq = getDietitianEquipment(id)
  const next: DietitianBcaEquipment = {
    ...eq,
    stockMovements: [{ at: new Date().toISOString(), by, action: entry.action, fromLocation: entry.fromLocation, toLocation: entry.toLocation }, ...arr(eq.stockMovements)],
  }
  persistEquipment(id, next)
  return next
}

// sortDietitiansForBcaCamp — 3-tier stable sort: verified(0) < owned-unverified(1) < none(2).
export function sortDietitiansForBcaCamp(camp: Camp, ranked: DietitianRankResult[]): DietitianRankResult[] {
  if (!campRequiresBca(camp)) return ranked
  const tier = (id: string) => (bcaVerified(id) ? 0 : dietitianHasBca(id) ? 1 : 2)
  return [...ranked].sort((a, b) => tier(a.dietitian.id) - tier(b.dietitian.id))
}

export function campBcaStatus(camp: Camp): 'NA' | 'ORANGE' | 'GREEN' {
  if (!campRequiresBca(camp)) return 'NA'
  if (!camp.dietitianId) return 'ORANGE'
  return bcaVerified(camp.dietitianId) ? 'GREEN' : 'ORANGE'
}

// ── Ranking ("nearest location + last-positive-feedback") ───────────────

// dietitianLastFeedback() — most recent CLOSED camp with a rating, "positive"
// = overall >= 4. om-data.js:538-546.
export function dietitianLastFeedback(dietitianId: string, camps: Camp[]): { campId: string; overall: number; positive: boolean } | null {
  const closed = camps
    .filter((c) => c.type === 'Diet' && c.dietitianId === dietitianId && c.status === 'CLOSED' && c.rating)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  if (!closed.length) return null
  const overall = Number(closed[0].rating?.overall || 0)
  return { campId: closed[0].id, overall, positive: overall >= 4 }
}

// rankDietitiansForCamp() — exact score formula, lower = better.
// Same-city: -100. Different-city (both have city data): -10. No city data: 0.
// Positive last feedback: -50. Below-threshold feedback: +20. No history: 0.
// om-data.js:547-566.
export function rankDietitiansForCamp(camp: Camp, camps: Camp[]): DietitianRankResult[] {
  const pool = dietitianRoster()
  if (!pool.length) return []
  const cCity = String(camp.city || '').toLowerCase().trim()
  return pool
    .map((d) => {
      const dHq = String(d.hq || '').toLowerCase().trim()
      let score = 0
      const reasons: string[] = []
      if (cCity && dHq && dHq === cCity) {
        score -= 100
        reasons.push(`Nearest — same city as camp (${d.hq})`)
      } else if (cCity && dHq) {
        score -= 10
        reasons.push(`Different city (${d.hq} → ${camp.city})`)
      }
      const fb = dietitianLastFeedback(d.id, camps)
      if (fb) {
        if (fb.positive) { score -= 50; reasons.push(`Positive last feedback (${fb.overall}/5)`) }
        else { score += 20; reasons.push(`Last feedback below threshold (${fb.overall}/5)`) }
      } else {
        reasons.push('No prior camp history')
      }
      return { dietitian: d, score, reasons }
    })
    .sort((a, b) => a.score - b.score)
}

// doctorPreferredDietitians — dietitians with the most camps for this doctor.
// om-data.js:1251-1268 counts/dates over ALL matching Diet camps regardless of
// status (no CLOSED filter) — do not add one here.
export function doctorPreferredDietitians(doctorId: string, camps: Camp[]): string[] {
  const counts = new Map<string, number>()
  camps
    .filter((c) => c.type === 'Diet' && c.doctorId === doctorId && c.dietitianId)
    .forEach((c) => counts.set(c.dietitianId as string, (counts.get(c.dietitianId as string) ?? 0) + 1))
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

export function dietitianDoctorHistory(dietitianId: string, doctorId: string, camps: Camp[]): { count: number; lastDate: string | null } {
  const matches = camps.filter((c) => c.type === 'Diet' && c.dietitianId === dietitianId && c.doctorId === doctorId)
  if (!matches.length) return { count: 0, lastDate: null }
  const lastDate = matches.reduce((max, c) => (c.date > max ? c.date : max), matches[0].date)
  return { count: matches.length, lastDate }
}

// ── Rate history + dietitian expense (Base + TA + Printing) ─────────────

function loadRateHistory(): Record<string, DietitianRateEntry[]> {
  return load(KEYS.RATE_HISTORY, {} as Record<string, DietitianRateEntry[]>)
}

export function getDietitianRateHistory(dietitianId: string): DietitianRateEntry[] {
  return loadRateHistory()[dietitianId] ?? []
}

export function getLastDietitianRates(dietitianId: string): DietitianRateEntry | null {
  const h = getDietitianRateHistory(dietitianId)
  return h.length ? h[0] : null
}

export async function recordDietitianRates(dietitianId: string, entry: Omit<DietitianRateEntry, 'setAt'>): Promise<DietitianRateEntry[]> {
  const all = loadRateHistory()
  const list = all[dietitianId] ?? []
  const next = [{ ...entry, setAt: new Date().toISOString() }, ...list].slice(0, 50)
  all[dietitianId] = next
  persist(KEYS.RATE_HISTORY, all)
  return next
}

// suggestDietitianRates() — defaults for the rates form: prior rate history
// wins, else master/detail defaults, else a seeded first-time baseline.
export function suggestDietitianRates(dietitianId: string, camp: Camp): { hasHistory: boolean; remuneration: number; ta: number; printing: number; targetCost: number } {
  const last = getLastDietitianRates(dietitianId)
  const det = dietitianDetails(dietitianId)
  const d = dietitianById(dietitianId)
  const rng = seeded(camp.id + '|diet-rem')
  const travelKm = typeof camp.foDistanceKm === 'number' ? camp.foDistanceKm : Math.round(8 + rng() * 50)
  const travel = Math.round(travelKm * 9)
  return {
    hasHistory: !!last,
    remuneration: num(last?.remuneration, d?.ratePerCamp, 2500 + Math.round(rng() * 1500)),
    ta: num(last?.ta, travel),
    printing: num(last?.printing, det.printingChargePerCamp, 150),
    targetCost: num(last?.targetCost, det.targetCostPerCamp, 0),
  }
}

// dietitianExpense() — exact priority-fallback chain. total = base + ta + printing
// (travel is a fallback source for ta, not independently added). om-data.js:740-767.
export function dietitianExpense(camp: Camp): DietitianExpense {
  const rng = seeded(camp.id + '|diet-rem')
  const det = camp.dietitianId ? dietitianDetails(camp.dietitianId) : { bankAccounts: [] }
  const d = camp.dietitianId ? dietitianById(camp.dietitianId) : undefined
  const last = camp.dietitianId ? getLastDietitianRates(camp.dietitianId) : null
  const rates = camp.dietitianRates ?? {}
  const travelKm = typeof camp.foDistanceKm === 'number' ? camp.foDistanceKm : Math.round(8 + rng() * 50)
  const travel = Math.round(travelKm * 9)
  const base = num(rates.remuneration, last?.remuneration, d?.ratePerCamp, 2500 + Math.round(rng() * 1500))
  const ta = num(rates.ta, camp.taAmount, last?.ta, travel)
  const printing = num(rates.printing, last?.printing, det.printingChargePerCamp, 150)
  return { base, travel, ta, printing, travelKm: Math.round(travelKm), total: base + ta + printing }
}

// poCampCost() — the per-camp PO-budgeted value from the linked project.
// diet-rates-modal.js:170-185.
export function poCampCost(camp: Camp): number {
  const proj = PROJECTS.find((p) => p.id === camp.projectId)
  if (!proj) return 0
  if (typeof proj.campCost === 'number' && proj.campCost > 0) return proj.campCost
  if (proj.poValueInr && proj.campsTarget) return Math.round(proj.poValueInr / proj.campsTarget)
  return 0
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

// campPaymentStatus() — PAID (ledger entry exists) takes priority over READY
// (report complete) takes priority over PENDING (default). om-data.js:869-874.
export function campPaymentStatus(camp: Camp): CampPaymentStatus | null {
  if (camp.type !== 'Diet') return null
  if (paymentsForCamp(camp.id).length) return 'PAID'
  if (isReportComplete(camp)) return 'READY'
  return 'PENDING'
}

export function paymentsByDietitian(dietitianId: string): DietPayment[] {
  return loadPayments().filter((p) => p.dietitianId === dietitianId)
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

// ── Payment ledger ────────────────────────────────────────────────────────

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

// ── Reopen requests (24h submission-token lock) ──────────────────────────

export const TOKEN_TTL_HOURS = 24

export function isTokenLocked(camp: Camp): boolean {
  if (camp.submissionCompleted) return false
  if (!camp.tokenActivatedAt) return false
  const hrs = (Date.now() - new Date(camp.tokenActivatedAt).getTime()) / 3_600_000
  return hrs >= TOKEN_TTL_HOURS
}

export function tokenHoursLeft(camp: Camp): number | null {
  if (!camp.tokenActivatedAt) return null
  const hrs = TOKEN_TTL_HOURS - (Date.now() - new Date(camp.tokenActivatedAt).getTime()) / 3_600_000
  return hrs
}

export function pendingReopenRequests(camps: Camp[]): { campId: string; city: string; date: string; dietitianName: string; request: CampReopenRequest }[] {
  const out: { campId: string; city: string; date: string; dietitianName: string; request: CampReopenRequest }[] = []
  camps.forEach((c) => {
    const pending = arr(c.reopenRequests).find((r) => r.status === 'PENDING')
    if (pending) out.push({ campId: c.id, city: c.city, date: c.date, dietitianName: c.dietitianId ? dietitianName(c.dietitianId) : '', request: pending })
  })
  return out
}

// ── Invites (WhatsApp shortlist / accept / decline) ──────────────────────

function loadInvites(): Record<string, DietInvite[]> {
  return load(KEYS.INVITES, {} as Record<string, DietInvite[]>)
}

export function getCampInvites(campId: string): DietInvite[] {
  return loadInvites()[campId] ?? []
}

export function inviteSummary(campId: string): { total: number; accepted: number; pending: number; declined: number } {
  const list = getCampInvites(campId)
  return {
    total: list.length,
    accepted: list.filter((i) => i.response === 'ACCEPTED').length,
    declined: list.filter((i) => i.response === 'DECLINED').length,
    pending: list.filter((i) => i.response === null).length,
  }
}

// addCampInvites — dietitians already invited with a non-DECLINED response
// are skipped (won't be re-invited); declined ones can be re-invited (their
// old DECLINED record is replaced with a fresh pending invite).
export async function addCampInvites(campId: string, dietitianIds: string[], sentBy: string, channel: 'WHATSAPP' = 'WHATSAPP'): Promise<Record<string, DietInvite[]>> {
  const all = loadInvites()
  const list = all[campId] ?? []
  const existingActive = new Set(list.filter((i) => i.response !== 'DECLINED').map((i) => i.dietitianId))
  const toAdd = new Set(dietitianIds.filter((id) => !existingActive.has(id)))
  const additions: DietInvite[] = Array.from(toAdd).map((id) => ({ dietitianId: id, sentAt: new Date().toISOString(), sentBy, channel, response: null }))
  const kept = list.filter((i) => !toAdd.has(i.dietitianId))
  all[campId] = [...kept, ...additions]
  persist(KEYS.INVITES, all)
  return all
}

export async function recordInviteResponse(campId: string, dietitianId: string, response: 'ACCEPTED' | 'DECLINED', note?: string): Promise<Record<string, DietInvite[]>> {
  const all = loadInvites()
  const list = all[campId] ?? []
  all[campId] = list.map((i) => (i.dietitianId === dietitianId ? { ...i, response, respondedAt: new Date().toISOString(), respondedNote: note } : i))
  persist(KEYS.INVITES, all)
  return all
}

// ── Feedback / ratings ────────────────────────────────────────────────────

function loadFeedback(): Record<string, DietitianFeedback> {
  return load(KEYS.FEEDBACK, {} as Record<string, DietitianFeedback>)
}

export function dietitianFeedbacks(dietitianId: string, camps: Camp[]): (DietitianFeedback & { camp: Camp })[] {
  const all = loadFeedback()
  const myCamps = camps.filter((c) => c.type === 'Diet' && c.dietitianId === dietitianId)
  const out: (DietitianFeedback & { camp: Camp })[] = []
  myCamps.forEach((c) => {
    const fb = all[c.id]
    if (fb) out.push({ ...fb, camp: c })
  })
  return out.sort((a, b) => (b.at || '').localeCompare(a.at || ''))
}

// dietitianAverageRating() — simple mean of all feedback ratings, rounded to
// 1 decimal. Returns null (chip omitted) if there's no feedback at all.
export function dietitianAverageRating(dietitianId: string, camps: Camp[]): DietitianAverageRating | null {
  const f = dietitianFeedbacks(dietitianId, camps)
  if (!f.length) return null
  const avg = f.reduce((s, x) => s + (x.rating || 0), 0) / f.length
  return { avg: +avg.toFixed(1), count: f.length }
}

// ── Full profile bundle (Dietitian Profiles screen) ──────────────────────

export function dietitianProfileBundle(dietitianId: string, camps: Camp[]): DietitianProfileBundle | null {
  const d = dietitianById(dietitianId)
  if (!d) return null
  const myCamps = camps.filter((c) => c.type === 'Diet' && c.dietitianId === dietitianId)
  const closed = myCamps.filter((c) => c.status === 'CLOSED')
  // "Upcoming" here means "not closed and not cancelled" — no date comparison
  // at all, matching om-data.js:1349 exactly (a past-dated-but-still-open camp
  // still counts as upcoming; a future-dated CLOSED camp would not).
  const upcoming = myCamps.filter((c) => c.status !== 'CLOSED' && c.status !== 'CANCELLED' && c.status !== 'CANCELLED_CHARGED')
  const payments = paymentsByDietitian(dietitianId)
  const rollup = dietitianPaymentRollup(dietitianId, camps)

  // byProject — group camps by project; READY camps contribute to pendingAmt;
  // ledger payouts are pro-rated evenly across their campIds' projects.
  const byProjectMap = new Map<string, DietitianProjectBreakdown>()
  const resolveProject = (projectId?: string) => PROJECTS.find((p) => p.id === projectId) ?? { id: projectId || 'UNKNOWN', name: projectId || 'Unknown project' }
  myCamps.forEach((c) => {
    const proj = resolveProject(c.projectId)
    const key = proj.id
    const entry = byProjectMap.get(key) ?? { project: { id: proj.id, name: proj.name }, camps: 0, paidAmt: 0, pendingAmt: 0 }
    entry.camps++
    if (campPaymentStatus(c) === 'READY') entry.pendingAmt += dietitianExpense(c).total
    byProjectMap.set(key, entry)
  })
  payments.forEach((p) => {
    const perCamp = Math.round(p.amount / Math.max(1, p.campIds.length))
    p.campIds.forEach((campId) => {
      const camp = camps.find((c) => c.id === campId)
      const proj = resolveProject(camp?.projectId)
      const entry = byProjectMap.get(proj.id) ?? { project: { id: proj.id, name: proj.name }, camps: 0, paidAmt: 0, pendingAmt: 0 }
      entry.paidAmt += perCamp
      byProjectMap.set(proj.id, entry)
    })
  })

  return {
    dietitian: d,
    details: dietitianDetails(dietitianId),
    equipment: { bca: getDietitianEquipment(dietitianId) },
    camps: myCamps, closed, upcoming, payments, paymentRollup: rollup,
    rateHistory: getDietitianRateHistory(dietitianId),
    feedbacks: dietitianFeedbacks(dietitianId, camps),
    averageRating: dietitianAverageRating(dietitianId, camps),
    byProject: Array.from(byProjectMap.values()),
  }
}

// ── Coordinator assignment (Diet Coord Workspace's real, reachable path) ─

// assignDietitianByCoord — direct one-click assign; writes camp.dietitianId,
// a dietitianProposal already marked APPROVED (no separate pending stage in
// the live UI), and appends a rate-history entry. Blocked if the dietitian
// hasn't cleared OM·Diet approval. om-data.js:649-658.
export function assignDietitianByCoordPatch(
  camp: Camp, dietitianId: string, by: string,
  rates: { remuneration: number; ta: number; printing: number; targetCost: number; reason: string }
): Partial<Camp> | null {
  if (!dietitianApproved(dietitianId)) return null
  const d = dietitianById(dietitianId)
  return {
    dietitianId,
    dietitianRates: { remuneration: rates.remuneration, ta: rates.ta, printing: rates.printing, targetCost: rates.targetCost },
    dietitianProposal: {
      suggestedDietitianId: dietitianId,
      suggestedDietitianName: d?.name ?? dietitianId,
      suggestedAt: new Date().toISOString(),
      suggestedBy: by,
      reasons: [],
      score: 0,
      status: 'APPROVED',
      reviewedAt: new Date().toISOString(),
      reviewedBy: by,
    },
    status: camp.status === 'REQUESTED' ? 'CONFIRMED' : camp.status,
  }
}

export function approveTokenReopenPatch(): Partial<Camp> {
  return { tokenActivatedAt: new Date().toISOString() }
}

export function reopenRequestDecisionPatch(camp: Camp, decision: 'APPROVED' | 'DENIED', by: string, denialReason?: string): Partial<Camp> {
  const requests = arr(camp.reopenRequests).map((r) =>
    r.status === 'PENDING' ? { ...r, status: decision, decidedAt: new Date().toISOString(), decidedBy: by, ...(denialReason ? { denialReason } : {}) } : r
  )
  return decision === 'APPROVED'
    ? { reopenRequests: requests, tokenActivatedAt: new Date().toISOString() }
    : { reopenRequests: requests }
}
