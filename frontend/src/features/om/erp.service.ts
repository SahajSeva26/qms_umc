import type { Camp } from '@/types/camp.types'
import type { Project } from '@/types/project.types'
import { campStatus } from '@/features/om/om.service'
import type {
  VerificationRecord, VerificationStatusId, PoStats, Invoice, LeakageCategory, LeakageRow, LeakageCategoryKey,
} from '@/features/om/erp.types'
import { vMeta, DEFAULT_VERIFICATION } from '@/features/om/erp.types'

// TODO: replace with real API calls once backend endpoints exist.
// The ONLY new store this module owns is qms.erp.verification — Camps/
// Projects/Clients are read from the shared masters (useCampsData,
// useProjectsDataShared), never redefined here, matching erp-screening.js.
const KEYS = {
  VERIFICATION: 'qms.erp.verification',
  BILLED_CAMPS: 'qms.billing.campState',
  INVOICES: 'qms.billing.invoices',
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

export function screeningCamps(camps: Camp[]): Camp[] {
  return camps.filter((c) => c.type === 'Screening')
}
export function completedCamps(camps: Camp[]): Camp[] {
  return screeningCamps(camps).filter((c) => campStatus(c) === 'COMPLETED')
}

export async function getVerification(): Promise<Record<string, VerificationRecord>> {
  return load(KEYS.VERIFICATION, {} as Record<string, VerificationRecord>)
}

export function verificationFor(all: Record<string, VerificationRecord>, campId: string): VerificationRecord {
  return all[campId] ?? DEFAULT_VERIFICATION
}

export function isBillable(all: Record<string, VerificationRecord>, campId: string): boolean {
  return vMeta(verificationFor(all, campId).status).billable
}
export function isBlocked(all: Record<string, VerificationRecord>, campId: string): boolean {
  return !isBillable(all, campId)
}

export async function setVerificationAccepted(campId: string, by: string): Promise<Record<string, VerificationRecord>> {
  const all = load(KEYS.VERIFICATION, {} as Record<string, VerificationRecord>)
  const prev = verificationFor(all, campId)
  all[campId] = { ...prev, status: 'ACCEPTED', reviewed: true, decidedBy: by, decidedAt: new Date().toISOString(), history: [...prev.history, { at: new Date().toISOString(), by, status: 'ACCEPTED' }] }
  persist(KEYS.VERIFICATION, all)
  return all
}

export async function submitVerificationDecision(
  campId: string, status: VerificationStatusId, reason: string, rootCause: string, correctiveAction: string, responsible: string, by: string
): Promise<Record<string, VerificationRecord>> {
  const all = load(KEYS.VERIFICATION, {} as Record<string, VerificationRecord>)
  const prev = verificationFor(all, campId)
  all[campId] = {
    ...prev, status, reviewed: true, reason, rootCause, correctiveAction, responsible,
    decidedBy: by, decidedAt: new Date().toISOString(), reinstate: null,
    history: [...prev.history, { at: new Date().toISOString(), by, status, note: reason }],
  }
  persist(KEYS.VERIFICATION, all)
  return all
}

export async function requestReinstate(campId: string, by: string): Promise<Record<string, VerificationRecord>> {
  const all = load(KEYS.VERIFICATION, {} as Record<string, VerificationRecord>)
  const prev = verificationFor(all, campId)
  all[campId] = { ...prev, reinstate: { status: 'REQUESTED', by, at: new Date().toISOString() }, history: [...prev.history, { at: new Date().toISOString(), by, status: 'REOPEN_REQUESTED' }] }
  persist(KEYS.VERIFICATION, all)
  return all
}

export async function decideReinstate(campId: string, decision: 'APPROVED' | 'REJECTED', by: string): Promise<Record<string, VerificationRecord>> {
  const all = load(KEYS.VERIFICATION, {} as Record<string, VerificationRecord>)
  const prev = verificationFor(all, campId)
  const reinstate = prev.reinstate ? { ...prev.reinstate, status: decision, decidedBy: by, decidedAt: new Date().toISOString() } : null
  all[campId] = {
    ...prev,
    ...(decision === 'APPROVED' ? { status: 'ACCEPTED' as VerificationStatusId, reviewed: true } : {}),
    reinstate,
    history: [...prev.history, { at: new Date().toISOString(), by, status: decision === 'APPROVED' ? 'REOPEN_APPROVED' : 'REOPEN_REJECTED' }],
  }
  persist(KEYS.VERIFICATION, all)
  return all
}

// campRate() — Project doesn't have campsTarget/poValueInr in our model;
// map to our actual fields (valueAfterGst / totalCamps).
export function campRate(project: Project): number {
  return project.totalCamps ? Math.round(project.valueAfterGst / project.totalCamps) : 0
}

// poStats() — mirrors poStats() exactly (erp-screening.js:117-139), mapped
// onto our Project's real field names.
export function poStats(project: Project, camps: Camp[], verification: Record<string, VerificationRecord>): PoStats {
  const projCamps = screeningCamps(camps).filter((c) => c.projectId === project.id)
  const completed = projCamps.filter((c) => campStatus(c) === 'COMPLETED')
  const accepted = completed.filter((c) => verificationFor(verification, c.id).status === 'ACCEPTED')
  const rejected = completed.filter((c) => verificationFor(verification, c.id).status === 'REJECTED')
  const blocked = completed.filter((c) => isBlocked(verification, c.id))
  const pendingVer = completed.filter((c) => !verificationFor(verification, c.id).reviewed)
  const cancelledCharged = projCamps.filter((c) => c.status === 'CANCELLED_CHARGED')
  const cancelledNon = projCamps.filter((c) => c.status === 'CANCELLED')

  const poQty = project.totalCamps || 0
  const consumed = accepted.length + cancelledCharged.length
  const remaining = Math.max(0, poQty - consumed)
  const rate = campRate(project)

  return {
    poQty, consumed, remaining,
    completed: completed.length, accepted: accepted.length, rejected: rejected.length,
    blocked: blocked.length, pendingVer: pendingVer.length,
    cancelledCharged: cancelledCharged.length, cancelledNon: cancelledNon.length,
    poValue: project.valueAfterGst || 0, rate,
    consumedValue: consumed * rate, remainingValue: remaining * rate,
  }
}

export function poAlerts(project: Project, stats: PoStats): { level: 'red' | 'amber'; message: string }[] {
  const alerts: { level: 'red' | 'amber'; message: string }[] = []
  if (stats.poQty && stats.remaining <= 0) alerts.push({ level: 'red', message: 'PO exhausted' })
  else if (stats.poQty && stats.remaining <= Math.ceil(stats.poQty * 0.1)) alerts.push({ level: 'amber', message: `PO near exhaustion — ${stats.remaining} camps left` })
  if (project.poExpiry) {
    const days = Math.round((new Date(project.poExpiry).getTime() - Date.now()) / 86400000)
    if (days >= 0 && days <= 30) alerts.push({ level: 'amber', message: `PO expiring in ${days} day${days === 1 ? '' : 's'}` })
  }
  return alerts
}

// ── Invoicing ─────────────────────────────────────────────────────────────
export async function getBilledCampIds(): Promise<Set<string>> {
  const state = load(KEYS.BILLED_CAMPS, {} as Record<string, 'BILLED'>)
  return new Set(Object.entries(state).filter(([, v]) => v === 'BILLED').map(([k]) => k))
}

export async function getInvoices(): Promise<Invoice[]> {
  return load(KEYS.INVOICES, [] as Invoice[])
}

export function billableCampsForProject(project: Project, camps: Camp[], verification: Record<string, VerificationRecord>, billed: Set<string>): Camp[] {
  return screeningCamps(camps).filter((c) =>
    c.projectId === project.id && campStatus(c) === 'COMPLETED' && isBillable(verification, c.id) && !billed.has(c.id)
  )
}

export async function generateInvoice(project: Project, billableIds: string[], by: string): Promise<Invoice[]> {
  const rate = campRate(project)
  const invoices = load(KEYS.INVOICES, [] as Invoice[])
  const invoice: Invoice = {
    id: `INV-${Date.now().toString().slice(-6)}`, projectId: project.id, clientId: project.clientId, poNo: project.poNo,
    generatedBy: by, generatedOn: new Date().toISOString(), rate, addlRate: 0,
    lines: billableIds.map((campId) => ({ campId, kind: 'CAMP', desc: `Camp ${campId}`, qty: 1, rate, amount: rate })),
    campIds: billableIds, voidCampIds: [], focCampIds: [],
    campCount: billableIds.length, additionalPatients: 0,
    subtotal: billableIds.length * rate, total: billableIds.length * rate,
    stage: 'GENERATED', paymentStatus: 'OUTSTANDING',
  }
  const nextInvoices = [...invoices, invoice]
  persist(KEYS.INVOICES, nextInvoices)

  const billedState = load(KEYS.BILLED_CAMPS, {} as Record<string, 'BILLED'>)
  for (const id of billableIds) billedState[id] = 'BILLED'
  persist(KEYS.BILLED_CAMPS, billedState)

  return nextInvoices
}

// ── Revenue Assurance — leakage() exactly (erp-screening.js:147-173) ────────
const CATEGORY_META: Record<LeakageCategoryKey, { label: string; recoverable: boolean }> = {
  NOT_BILLED: { label: 'Completed but not billed', recoverable: true },
  TECHNICAL: { label: 'Not billed — QMS technical issue', recoverable: true },
  REJECTED: { label: 'Rejected camps', recoverable: false },
  HOLD: { label: 'On hold / clarification', recoverable: true },
  DOCS: { label: 'Missing documentation', recoverable: true },
  DISPUTE: { label: 'Client dispute', recoverable: false },
}

export function leakage(camps: Camp[], projects: Project[], verification: Record<string, VerificationRecord>, billed: Set<string>): { categories: LeakageCategory[]; rows: LeakageRow[]; total: number; recoverable: number; unrecoverable: number } {
  const categories: Record<LeakageCategoryKey, LeakageCategory> = Object.fromEntries(
    (Object.keys(CATEGORY_META) as LeakageCategoryKey[]).map((k) => [k, { key: k, ...CATEGORY_META[k], amount: 0, count: 0 }])
  ) as Record<LeakageCategoryKey, LeakageCategory>
  const rows: LeakageRow[] = []

  for (const c of completedCamps(camps)) {
    const project = projects.find((p) => p.id === c.projectId)
    if (!project) continue
    const amt = campRate(project)
    const v = verificationFor(verification, c.id)

    let key: LeakageCategoryKey | null = null
    if (v.status === 'ACCEPTED') { if (!billed.has(c.id)) key = 'NOT_BILLED' }
    else if (v.status === 'TECHNICAL_ISSUE') key = 'TECHNICAL'
    else if (v.status === 'REJECTED') key = 'REJECTED'
    else if (v.status === 'HOLD' || v.status === 'NEED_CLARIFICATION') key = 'HOLD'
    else if (v.status === 'INCOMPLETE_DOCS') key = 'DOCS'
    else if (v.status === 'CLIENT_DISPUTE') key = 'DISPUTE'
    // DUPLICATE has no bucket — silently excluded, matching the prototype.

    if (!key) continue
    categories[key].amount += amt
    categories[key].count += 1
    rows.push({ campId: c.id, clientId: c.clientId, category: key, reason: v.reason ?? (key === 'NOT_BILLED' ? 'Accepted, awaiting invoice' : ''), amount: amt })
  }

  const list = Object.values(categories)
  const total = list.reduce((s, c) => s + c.amount, 0)
  const recoverable = list.filter((c) => c.recoverable).reduce((s, c) => s + c.amount, 0)
  return { categories: list, rows: rows.sort((a, b) => b.amount - a.amount), total, recoverable, unrecoverable: total - recoverable }
}
