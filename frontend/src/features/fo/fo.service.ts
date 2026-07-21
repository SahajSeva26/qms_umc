// FO Management + My FO Workspace shared mock/service layer — claims,
// training, leaves, incidents, consumables, notifications. Both features
// read/write these same qms.fo.* stores (see fo.types.ts's header comment).
// TODO: entirely mock/frontend-only — no backend endpoints exist yet.

import type {
  FoClaim, ClaimStatus, LeaveRequest, TrainingRecord, TrainingStatus, Incident, IncidentStatus,
  ConsumableLot, FoNotification, MachineFlag,
} from '@/features/fo/fo.types'
import { TRAINING_CATALOG, INCIDENT_CATEGORIES } from '@/features/fo/fo.types'
import type { DeviceCatalogItem } from '@/types/device.types'

const KEYS = {
  CLAIMS: 'qms.fo.claims',
  TRAINING: 'qms.fo.training',
  LEAVES: 'qms.fo.leaves',
  INCIDENTS: 'qms.fo.incidents',
  CONSUMABLES: 'qms.fo.consumables',
  NOTIF: 'qms.fo.notif',
  MACHINE_FLAGS: 'qms.incidents.machineFlags',
}

// Field Officer ids matching camps.mock.ts's CAMPS array (p-ravi, p-anita,
// p-amit, p-pooja are the only foIds actually referenced there).
const SEED_FO_IDS = ['p-ravi', 'p-anita', 'p-amit'] as const
const FO_NAMES: Record<string, string> = {
  'p-ravi': 'Ravi Kumar',
  'p-anita': 'Anita Sharma',
  'p-amit': 'Amit Verma',
  'p-pooja': 'Pooja Nair',
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
    // demo persistence only — safe to ignore quota/serialization errors
  }
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

function seedClaims(): FoClaim[] {
  const claims: FoClaim[] = []
  SEED_FO_IDS.forEach((foId, i) => {
    const foName = FO_NAMES[foId]
    claims.push({
      id: `CL-${1300 + claims.length}`,
      foId,
      foName,
      date: daysAgo(2 + i),
      type: 'TA',
      amount: 1200 + i * 180,
      status: 'PENDING',
      filedOn: daysAgo(2 + i),
    })
    claims.push({
      id: `CL-${1300 + claims.length}`,
      foId,
      foName,
      date: daysAgo(5 + i),
      type: 'DA',
      amount: 400 + i * 40,
      status: i === 0 ? 'APPROVED' : 'PENDING',
      filedOn: daysAgo(5 + i),
      ...(i === 0 ? { decidedOn: daysAgo(4) } : {}),
    })
  })
  return claims
}

function loadClaims(): FoClaim[] {
  return load(KEYS.CLAIMS, seedClaims())
}

// TODO: replace with real API calls once backend endpoints exist
export async function getClaims(): Promise<FoClaim[]> {
  return loadClaims()
}

// TODO: replace with real API calls once backend endpoints exist
export async function fileClaim(
  claim: Omit<FoClaim, 'id' | 'filedOn' | 'status'>,
  status: ClaimStatus = 'PENDING'
): Promise<FoClaim[]> {
  const claims = loadClaims()
  const next: FoClaim = {
    ...claim,
    id: `CL-${1300 + claims.length}`,
    status,
    filedOn: new Date().toISOString(),
  }
  const all = [next, ...claims]
  persist(KEYS.CLAIMS, all)
  return all
}

// TODO: replace with real API calls once backend endpoints exist
export async function decideClaim(id: string, decision: 'APPROVED' | 'REJECTED'): Promise<FoClaim[]> {
  const next = loadClaims().map((c) =>
    c.id === id ? { ...c, status: decision, decidedOn: new Date().toISOString() } : c
  )
  persist(KEYS.CLAIMS, next)
  return next
}

function loadAllTraining(): TrainingRecord[] {
  return load(KEYS.TRAINING, [])
}

function seedTrainingForFo(foId: string): TrainingRecord[] {
  const today = new Date()
  return TRAINING_CATALOG.map((entry, i) => {
    const passed = new Date(today)
    passed.setDate(passed.getDate() - (20 + i * 15))
    const expires = new Date(passed)
    expires.setDate(expires.getDate() + entry.validityDays)
    return {
      foId,
      code: entry.code,
      passedOn: passed.toISOString(),
      expiresOn: expires.toISOString(),
      score: 78 + (i * 3) % 22,
    }
  })
}

function trainingStatus(record: TrainingRecord): TrainingStatus {
  return new Date(record.expiresOn).getTime() >= Date.now() ? 'VALID' : 'EXPIRED'
}

// TODO: replace with real API calls once backend endpoints exist
export async function getTraining(foId: string): Promise<(TrainingRecord & { status: TrainingStatus })[]> {
  const all = loadAllTraining()
  let records = all.filter((r) => r.foId === foId)
  if (records.length === 0) {
    records = seedTrainingForFo(foId)
    const merged = [...all, ...records]
    persist(KEYS.TRAINING, merged)
  }
  return records.map((r) => ({ ...r, status: trainingStatus(r) }))
}

// TODO: replace with real API calls once backend endpoints exist
export async function markTrainingComplete(foId: string, code: string): Promise<(TrainingRecord & { status: TrainingStatus })[]> {
  const catalogEntry = TRAINING_CATALOG.find((c) => c.code === code)
  const validityDays = catalogEntry?.validityDays ?? 365
  const all = loadAllTraining()
  const today = new Date()
  const expires = new Date(today)
  expires.setDate(expires.getDate() + validityDays)

  const exists = all.some((r) => r.foId === foId && r.code === code)
  const next = exists
    ? all.map((r) =>
        r.foId === foId && r.code === code
          ? { ...r, passedOn: today.toISOString(), expiresOn: expires.toISOString(), score: 90 }
          : r
      )
    : [...all, { foId, code, passedOn: today.toISOString(), expiresOn: expires.toISOString(), score: 90 }]

  persist(KEYS.TRAINING, next)
  return next.filter((r) => r.foId === foId).map((r) => ({ ...r, status: trainingStatus(r) }))
}

function loadLeaves(): LeaveRequest[] {
  return load(KEYS.LEAVES, [])
}

// TODO: replace with real API calls once backend endpoints exist
export async function getLeaves(foId?: string): Promise<LeaveRequest[]> {
  const leaves = loadLeaves()
  return foId ? leaves.filter((l) => l.foId === foId) : leaves
}

// TODO: replace with real API calls once backend endpoints exist
export async function applyLeave(leave: Omit<LeaveRequest, 'id' | 'filedOn' | 'status'>): Promise<LeaveRequest[]> {
  const leaves = loadLeaves()
  const next: LeaveRequest = {
    ...leave,
    id: `LV-${1500 + leaves.length}`,
    status: 'PENDING',
    filedOn: new Date().toISOString(),
  }
  const all = [next, ...leaves]
  persist(KEYS.LEAVES, all)
  return all
}

function loadIncidents(): Incident[] {
  return load(KEYS.INCIDENTS, [])
}

// TODO: replace with real API calls once backend endpoints exist
export async function getIncidents(foId?: string): Promise<Incident[]> {
  const incidents = loadIncidents()
  return foId ? incidents.filter((i) => i.foId === foId) : incidents
}

function slaMinutesFor(category: Incident['category']): number {
  return INCIDENT_CATEGORIES.find((c) => c.value === category)?.slaMinutes ?? 240
}

function historyEntry(action: string, by: string, note?: string): { at: string; action: string; by: string; note?: string } {
  return { at: new Date().toISOString(), action, by, ...(note ? { note } : {}) }
}

// TODO: replace with real API calls once backend endpoints exist
export async function raiseIncident(incident: Omit<Incident, 'id' | 'status' | 'createdAt'>): Promise<Incident[]> {
  const next: Incident = {
    ...incident,
    id: `INC-${Date.now()}`,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    slaMinutes: incident.slaMinutes ?? slaMinutesFor(incident.category),
    history: [historyEntry('RAISED', incident.raisedByName)],
  }
  const all = [next, ...loadIncidents()]
  persist(KEYS.INCIDENTS, all)
  if (next.deviceId && (next.category === 'machine_failure')) {
    await flagMachineFaulty(next.deviceId, next.id, next.notes)
  }
  return all
}

// TODO: replace with real API calls once backend endpoints exist
export async function setIncidentStatus(id: string, status: IncidentStatus): Promise<Incident[]> {
  const next = loadIncidents().map((i) => (i.id === id ? { ...i, status } : i))
  persist(KEYS.INCIDENTS, next)
  return next
}

// TODO: replace with real API calls once backend endpoints exist
export async function assignIncident(id: string, assignedToId: string, assignedToName: string, by: string): Promise<Incident[]> {
  const next = loadIncidents().map((i) =>
    i.id === id
      ? { ...i, status: 'ASSIGNED' as const, assignedToId, assignedToName, assignedAt: new Date().toISOString(), history: [...(i.history ?? []), historyEntry('ASSIGNED', by, `to ${assignedToName}`)] }
      : i
  )
  persist(KEYS.INCIDENTS, next)
  return next
}

// TODO: replace with real API calls once backend endpoints exist
export async function startIncident(id: string, by: string): Promise<Incident[]> {
  const next = loadIncidents().map((i) =>
    i.id === id
      ? { ...i, status: 'IN_PROGRESS' as const, startedAt: new Date().toISOString(), history: [...(i.history ?? []), historyEntry('STARTED', by)] }
      : i
  )
  persist(KEYS.INCIDENTS, next)
  return next
}

// TODO: replace with real API calls once backend endpoints exist
export async function resolveIncident(id: string, by: string, notes: string, replacementDeviceId?: string, replacementNotes?: string): Promise<Incident[]> {
  const all = loadIncidents()
  const target = all.find((i) => i.id === id)
  const next = all.map((i) =>
    i.id === id
      ? {
          ...i, status: 'RESOLVED' as const, resolvedAt: new Date().toISOString(), resolvedNotes: notes,
          replacementDeviceId, replacementNotes,
          history: [...(i.history ?? []), historyEntry('RESOLVED', by, notes)],
        }
      : i
  )
  persist(KEYS.INCIDENTS, next)
  if (target?.deviceId && replacementDeviceId) {
    await clearMachineFlag(target.deviceId, by)
  }
  return next
}

// TODO: replace with real API calls once backend endpoints exist
export async function closeIncident(id: string, by: string, notes?: string): Promise<Incident[]> {
  const next = loadIncidents().map((i) =>
    i.id === id
      ? { ...i, status: 'CLOSED' as const, closedAt: new Date().toISOString(), closedNotes: notes, history: [...(i.history ?? []), historyEntry('CLOSED', by, notes)] }
      : i
  )
  persist(KEYS.INCIDENTS, next)
  return next
}

// TODO: replace with real API calls once backend endpoints exist
export async function cancelIncident(id: string, by: string, reason: string): Promise<Incident[]> {
  const next = loadIncidents().map((i) =>
    i.id === id
      ? { ...i, status: 'CANCELLED' as const, cancelledAt: new Date().toISOString(), cancelledReason: reason, history: [...(i.history ?? []), historyEntry('CANCELLED', by, reason)] }
      : i
  )
  persist(KEYS.INCIDENTS, next)
  return next
}

// computeSlaState() — minutes elapsed since createdAt vs. the ticket's SLA
// window; only meaningful while still open (RESOLVED/CLOSED/CANCELLED tickets
// freeze at their resolution time instead of ticking forever).
export function computeSlaState(incident: Incident): { minutesElapsed: number; minutesRemaining: number; breached: boolean } {
  const sla = incident.slaMinutes ?? slaMinutesFor(incident.category)
  const endRef = incident.resolvedAt ?? incident.closedAt ?? incident.cancelledAt ?? new Date().toISOString()
  const minutesElapsed = Math.max(0, Math.round((new Date(endRef).getTime() - new Date(incident.createdAt).getTime()) / 60_000))
  return { minutesElapsed, minutesRemaining: sla - minutesElapsed, breached: minutesElapsed > sla }
}

// ── Machine fault-flagging — externalized source of truth (fo.types.ts's
// MachineFlag), keyed by deviceId, NOT DeviceCatalogItem.faulty. ──────────

function loadMachineFlags(): MachineFlag[] {
  return load(KEYS.MACHINE_FLAGS, [])
}

// TODO: replace with real API calls once backend endpoints exist
export async function getMachineFlags(): Promise<MachineFlag[]> {
  return loadMachineFlags()
}

export function isMachineFaulty(deviceId: string, flags: MachineFlag[]): boolean {
  const flag = flags.find((f) => f.deviceId === deviceId)
  return !!flag && flag.faulty && !flag.clearedAt
}

// TODO: replace with real API calls once backend endpoints exist
export async function flagMachineFaulty(deviceId: string, incidentId: string, notes?: string): Promise<MachineFlag[]> {
  const all = loadMachineFlags()
  const existing = all.find((f) => f.deviceId === deviceId && !f.clearedAt)
  const next = existing
    ? all.map((f) => (f === existing ? { ...f, flaggedAt: new Date().toISOString(), flaggedByIncidentId: incidentId, notes } : f))
    : [...all, { deviceId, faulty: true, flaggedAt: new Date().toISOString(), flaggedByIncidentId: incidentId, notes }]
  persist(KEYS.MACHINE_FLAGS, next)
  return next
}

// TODO: replace with real API calls once backend endpoints exist
export async function clearMachineFlag(deviceId: string, clearedBy: string): Promise<MachineFlag[]> {
  const next = loadMachineFlags().map((f) =>
    f.deviceId === deviceId && !f.clearedAt ? { ...f, clearedAt: new Date().toISOString(), clearedBy } : f
  )
  persist(KEYS.MACHINE_FLAGS, next)
  return next
}

// suggestReplacement() — same-category spare device with units available,
// preferring one already assigned to no one / a backup unit, closest to the
// faulty device's vendor city if known (falls back to any available match).
export function suggestReplacement(faultyDeviceId: string, devices: DeviceCatalogItem[]): DeviceCatalogItem | null {
  const faulty = devices.find((d) => d.id === faultyDeviceId)
  if (!faulty) return null
  const candidates = devices.filter((d) =>
    d.id !== faultyDeviceId &&
    (d.category === faulty.category || (faulty.type && d.type === faulty.type)) &&
    d.unitsAvailable > 0 &&
    d.status !== 'FAULTY'
  )
  if (!candidates.length) return null
  const sameCity = faulty.vendorCity ? candidates.find((d) => d.vendorCity === faulty.vendorCity) : undefined
  return sameCity ?? candidates[0]
}

// notifyChannels() — a pure display-string helper (no actual dispatch; mirrors
// the prototype's UI-only "notified via SMS/WhatsApp/Email" banner text)
// describing which channels a ticket's escalation would notionally reach.
export function notifyChannels(incident: Incident): string[] {
  const channels = ['In-app']
  if (incident.severity === 'CRITICAL' || incident.category === 'sos') channels.push('SMS', 'Phone call')
  else if (incident.severity === 'HIGH') channels.push('SMS')
  channels.push('Email')
  return channels
}

function loadAllConsumables(): ConsumableLot[] {
  return load(KEYS.CONSUMABLES, [])
}

// Seed lots reference the same consumable ids as foConfig.types.ts's
// SEED_CONSUMABLE_MAP so the Run Camp wizard's per-test consumable lookups
// resolve against real inventory for this FO.
function seedConsumablesForFo(foId: string): ConsumableLot[] {
  const defs: Omit<ConsumableLot, 'id' | 'foId'>[] = [
    { name: 'Glucose test strips', type: 'GLUCOSE_STRIP', brand: 'AccuCheck', lot: 'GLU-2201', qty: 240, reorderAt: 100, expiry: daysFromNow(210) },
    { name: 'HbA1c test strips', type: 'HBA1C_STRIP', brand: 'Bio-Rad', lot: 'HBA-1187', qty: 60, reorderAt: 50, expiry: daysFromNow(18) },
    { name: 'Lancets', type: 'LANCET', brand: 'Accu-Chek', lot: 'LAN-3390', qty: 500, reorderAt: 150, expiry: daysFromNow(400) },
    { name: 'Alcohol swabs', type: 'ALCOHOL_SWAB', brand: 'Medline', lot: 'SWB-0921', qty: 25, reorderAt: 100, expiry: daysFromNow(-5) },
    { name: 'ECG electrodes', type: 'ECG_ELECTRODE', brand: '3M', lot: 'ECG-4471', qty: 320, reorderAt: 200, expiry: daysFromNow(300) },
    { name: 'ECG paper rolls', type: 'ECG_PAPER', brand: 'Nihon Kohden', lot: 'ECGP-1102', qty: 8, reorderAt: 10, expiry: daysFromNow(500) },
    { name: 'Conductive gel', type: 'CONDUCTIVE_GEL', brand: 'Parker', lot: 'GEL-7734', qty: 12, reorderAt: 5, expiry: daysFromNow(25) },
    { name: 'Lipid profile strips', type: 'LIPID_STRIP', brand: 'CardioChek', lot: 'LIP-5521', qty: 40, reorderAt: 40, expiry: daysFromNow(60) },
    { name: 'Tape measure', type: 'TAPE_MEAS', brand: 'Butterfly', lot: 'TM-0087', qty: 3, expiry: daysFromNow(720) },
  ]
  return defs.map((d, i) => ({ ...d, id: `CON-${foId}-${i}`, foId }))
}

// TODO: replace with real API calls once backend endpoints exist
export async function getConsumables(foId: string): Promise<ConsumableLot[]> {
  const all = loadAllConsumables()
  let lots = all.filter((c) => c.foId === foId)
  if (lots.length === 0) {
    lots = seedConsumablesForFo(foId)
    persist(KEYS.CONSUMABLES, [...all, ...lots])
  }
  return lots
}

function loadNotifications(): FoNotification[] {
  return load(KEYS.NOTIF, [])
}

// TODO: replace with real API calls once backend endpoints exist
// Persisted broadcasts only — the live-synthesized feed (today's camp,
// pending claims, expiring consumables, etc.) is computed by
// buildLiveNotifications() in the hook layer, not stored here.
export async function getNotifications(foId: string): Promise<FoNotification[]> {
  return loadNotifications().filter((n) => n.foId === foId)
}

// TODO: replace with real API calls once backend endpoints exist
export async function markNotificationsRead(foId: string): Promise<FoNotification[]> {
  const next = loadNotifications().map((n) =>
    n.foId === foId ? { ...n, readAt: new Date().toISOString() } : n
  )
  persist(KEYS.NOTIF, next)
  return next.filter((n) => n.foId === foId)
}
