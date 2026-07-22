import type { Camp } from '@/types/camp.types'
import { DOCTORS } from '@/features/camps/camps.mock'
import { CLIENTS, MRS } from '@/types/client.types'
import type { ClientMr } from '@/types/client.types'
import type { Doctor, EngagementBand, EngagementStats, DoctorPrediction, DoctorBroadcast } from '@/features/doctors/doctors.types'
import type { TeleConsult } from '@/features/doctors/components/tabs/TeleConsultTab.types'

// TODO: entirely mock/frontend-only — no backend endpoints exist for doctors yet.
// Mirrors camps.service.ts's seed + localStorage overlay pattern: the seed
// (DOCTORS from camps.mock.ts) is never mutated in place — new doctors go into
// an 'added' overlay array, and edits to existing (seed or added) doctors go
// into an 'edits' overlay object keyed by id, patch-merged on read.

const STORAGE_KEY_ADDED = 'qms.doctors.added'
const STORAGE_KEY_EDITS = 'qms.doctors.edits'
const STORAGE_KEY_BROADCASTS = 'qms.doctors.broadcasts'
const STORAGE_KEY_TELECONSULTS = 'qms.doctors.teleconsults'

function loadAdded(): Doctor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADDED)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to empty
  }
  return []
}

function persistAdded(added: Doctor[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ADDED, JSON.stringify(added))
  } catch {
    // demo persistence only — safe to ignore quota/serialization errors
  }
}

function loadEdits(): Record<string, Partial<Doctor>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EDITS)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to empty
  }
  return {}
}

function persistEdits(edits: Record<string, Partial<Doctor>>) {
  try {
    localStorage.setItem(STORAGE_KEY_EDITS, JSON.stringify(edits))
  } catch {
    // demo persistence only — safe to ignore quota/serialization errors
  }
}

function loadBroadcasts(): DoctorBroadcast[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BROADCASTS)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to empty
  }
  return []
}

function persistBroadcasts(broadcasts: DoctorBroadcast[]) {
  try {
    localStorage.setItem(STORAGE_KEY_BROADCASTS, JSON.stringify(broadcasts))
  } catch {
    // demo persistence only — safe to ignore quota/serialization errors
  }
}

// TODO: replace with real API calls once backend endpoints exist
export async function getAllDoctors(): Promise<Doctor[]> {
  const edits = loadEdits()
  const merged = [...DOCTORS, ...loadAdded()].map((d) => (edits[d.id] ? { ...d, ...edits[d.id] } : d))
  return merged
}

// TODO: replace with real API calls once backend endpoints exist
export async function addDoctor(rec: Doctor): Promise<Doctor[]> {
  const added = loadAdded()
  added.push(rec)
  persistAdded(added)
  return getAllDoctors()
}

// TODO: replace with real API calls once backend endpoints exist
export async function editDoctor(id: string, patch: Partial<Doctor>): Promise<Doctor[]> {
  const edits = loadEdits()
  edits[id] = { ...edits[id], ...patch }
  persistEdits(edits)
  return getAllDoctors()
}

// TODO: replace with real API calls once backend endpoints exist
export async function getBroadcasts(): Promise<DoctorBroadcast[]> {
  return loadBroadcasts()
}

// TODO: replace with real API calls once backend endpoints exist
export async function addBroadcast(entry: DoctorBroadcast): Promise<DoctorBroadcast[]> {
  const all = loadBroadcasts()
  all.unshift(entry)
  persistBroadcasts(all)
  return all
}

// Tele-consults persist to qms.doctors.teleconsults (matches the prototype's
// loadStore/persistStore('teleconsults', ...)) so bookings/edits survive a
// reload instead of resetting to the seed on every navigation.
export function loadTeleConsults(): TeleConsult[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TELECONSULTS)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to null (caller seeds)
  }
  return null
}

export function saveTeleConsults(list: TeleConsult[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TELECONSULTS, JSON.stringify(list))
  } catch {
    // demo persistence only — safe to ignore quota/serialization errors
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

// Camps are supplied by the caller (via useCampsData()) rather than imported
// here directly — keeps this service from reaching into features/camps/
// internals beyond the DOCTORS seed array, per CLAUDE.md §3.
export function engagementFor(doctorId: string, camps: Camp[]): EngagementStats {
  const cs = camps.filter((c) => c.doctorId === doctorId)
  const todayIso = new Date().toISOString().slice(0, 10)

  const closed = cs.filter((c) => c.status === 'CLOSED')
  const upcoming = cs.filter((c) => c.date >= todayIso && !c.status.startsWith('CANCEL'))

  const patients = closed.reduce((sum, c) => sum + (c.patientsDone || 0), 0)
  const rx = closed.reduce((sum, c) => sum + (c.rxCount || 0), 0)

  const rated = closed.filter((c) => c.feedback)
  const avgRating = rated.length ? round1(rated.reduce((sum, c) => sum + c.feedback, 0) / rated.length) : 0

  let lastDate: string | null = null
  for (const c of cs) {
    if (!lastDate || c.date > lastDate) lastDate = c.date
  }
  const daysSinceLast = lastDate ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000) : null

  return {
    campCount: cs.length,
    closedCount: closed.length,
    upcomingCount: upcoming.length,
    patients,
    rx,
    avgRating,
    lastDate,
    daysSinceLast,
  }
}

export function engagementBand(e: EngagementStats): EngagementBand {
  if (!e.campCount || e.daysSinceLast === null) return 'NEW'
  if (e.campCount >= 6 && e.avgRating >= 4.3) return 'CHAMPION'
  if (e.daysSinceLast <= 60) return 'ACTIVE'
  if (e.daysSinceLast <= 180) return 'DORMANT'
  return 'INACTIVE'
}

export function engagementScore(e: EngagementStats): number {
  return Math.round(e.campCount * 8 + e.avgRating * 8 + Math.max(0, 50 - (e.daysSinceLast || 999)))
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function doctorPrediction(e: EngagementStats, band: EngagementBand, score: number): DoctorPrediction {
  const churn: DoctorPrediction['churn'] = e.daysSinceLast === null ? 'NEW' : e.daysSinceLast > 180 ? 'HIGH' : e.daysSinceLast > 90 ? 'MEDIUM' : 'LOW'
  const conv = clamp(score + Math.round((e.avgRating || 0) * 4), 20, 95)
  const rxUplift = Math.round(8 + e.closedCount * 1.5 + (e.avgRating || 0) * 2)
  const bestType: DoctorPrediction['bestType'] = e.patients > 120 ? 'Screening' : 'Diet'

  const nbaByBand: Record<EngagementBand, string> = {
    CHAMPION: 'Offer co-branded camp + tele follow-up',
    ACTIVE: 'Schedule next camp within 3 weeks',
    DORMANT: 'Re-engage — WhatsApp + 1 camp invite',
    INACTIVE: 'Win-back call + incentive',
    NEW: 'Onboard — first camp + complete profile',
  }
  const nba = nbaByBand[band] ?? nbaByBand.NEW

  return { churn, conv, rxUplift, bestType, nba }
}

function hashNum(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h
}

// Deterministic pseudo-UIN, e.g. "SUN-123456" — mirrors the prototype's
// per-client doctor-UIN generator so the same clientId+doctorId pair always
// yields the same code.
export function genUIN(clientId: string, doctorId: string): string {
  const client = CLIENTS.find((c) => c.id === clientId)
  const prefix = (client?.name ?? clientId).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X')
  const suffix = 100000 + (hashNum(`${clientId}|${doctorId}`) % 900000)
  return `${prefix}-${suffix}`
}

// Companies the doctor is empanelled with — derived from their camps; falls
// back to companies whose MRs are based in the doctor's city, then to the
// first 2 clients overall. Exact port of the prototype's doctorCompanies().
export function doctorCompanies(doctor: Doctor, camps: Camp[]): string[] {
  const cs = camps.filter((c) => c.doctorId === doctor.id)
  const ids = new Set(cs.map((c) => c.clientId).filter((id): id is string => !!id))
  if (ids.size === 0) {
    MRS.filter((m) => (m.hq || '').toLowerCase() === (doctor.city || '').toLowerCase())
      .slice(0, 3)
      .forEach((m) => ids.add(m.clientId))
    if (ids.size === 0) CLIENTS.slice(0, 2).forEach((c) => ids.add(c.id))
  }
  return Array.from(ids)
}

// MR(s) of a company covering this doctor — prefers MRs in the doctor's city.
// Exact port of the prototype's mrsForDoctorCompany().
export function mrsForDoctorCompany(doctor: Doctor, clientId: string): ClientMr[] {
  const all = MRS.filter((m) => m.clientId === clientId)
  if (!all.length) return []
  const inCity = all.filter((m) => (m.hq || '').toLowerCase() === (doctor.city || '').toLowerCase())
  const pool = inCity.length ? inCity : all
  return [pool[hashNum(doctor.id + clientId) % pool.length]]
}
