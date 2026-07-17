import type { Camp, CampCancellation, CampConfirmation } from '@/types/camp.types'
import type { Dietitian, CampReminderLog, MediaItem, OnlineAssessment, TeleConsult, TeleConsultStatus } from '@/features/diet/diet.types'
import { DIETITIANS, TELE_CONSULTS } from '@/features/diet/diet.mock'

// TODO: replace with real API calls once backend endpoints exist.
// Diet camps read/write the SAME qms.master.camps store Camp Management
// owns (filtered by type==='Diet') — this file never keeps its own parallel
// camp store, matching the prototype exactly (diet-camps.js has no
// dedicated camp entity, see diet.types.ts header comment). Camp reads/
// writes are supplied by the caller (via the shared useCampsData hook) —
// this module never imports features/camps/ or touches qms.master.camps
// directly (features/camps/ is the sole owner of that store, CLAUDE.md §3).
// Functions below compute a Partial<Camp> patch; the hook layer persists it.

const KEYS = {
  DIETITIANS: 'qms.diet.dietitians',
  REMINDERS: 'qms.diet.reminders',
  MEDIA: 'qms.diet.media',
  ASSESSMENTS: 'qms.diet.assessments',
  TELECONSULTS: 'qms.diet.teleconsults',
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

export interface DietOwnData {
  dietitians: Dietitian[]
  reminders: Record<string, CampReminderLog>
  media: Record<string, MediaItem[]>
  assessments: Record<string, OnlineAssessment[]>
  teleConsults: TeleConsult[]
}

export async function getData(): Promise<DietOwnData> {
  return {
    dietitians: load(KEYS.DIETITIANS, DIETITIANS),
    reminders: load(KEYS.REMINDERS, {} as Record<string, CampReminderLog>),
    media: load(KEYS.MEDIA, {} as Record<string, MediaItem[]>),
    assessments: load(KEYS.ASSESSMENTS, {} as Record<string, OnlineAssessment[]>),
    teleConsults: load(KEYS.TELECONSULTS, TELE_CONSULTS),
  }
}

export function setPatientCountPatch(patientsDone: number, patientsExpected: number | undefined, by: string, note: string): Partial<Camp> {
  return {
    patientsDone,
    ...(patientsExpected !== undefined ? { patientsExpected } : {}),
    patientCountBy: by,
    patientCountNote: note,
    patientCountAt: new Date().toISOString(),
  }
}

export function markLivePatch(): Partial<Camp> {
  return { status: 'LIVE' }
}

const CANCEL_POLICY = { freeHoursPrior: 24, pctDeducted: 50, unitCost: 5000 }

export function cancelCampPatch(camp: Camp, reason: CampCancellation['reason'], notes: string, slotStartHour: number): Partial<Camp> {
  const slotDate = new Date(`${camp.date}T${String(slotStartHour).padStart(2, '0')}:00:00`)
  const hoursBefore = Math.ceil((slotDate.getTime() - Date.now()) / 3_600_000)
  const isFree = hoursBefore >= CANCEL_POLICY.freeHoursPrior
  const chargeAmount = isFree ? 0 : Math.round(CANCEL_POLICY.unitCost * (CANCEL_POLICY.pctDeducted / 100))
  const cancellation: CampCancellation = {
    when: new Date().toISOString(), reason, notes, hoursBefore, chargeAmount, policy: CANCEL_POLICY,
  }
  return { status: isFree ? 'CANCELLED' : 'CANCELLED_CHARGED', cancellation }
}

export function closeCampPatch(camp: Camp): Partial<Camp> {
  const patientsDone = camp.patientsDone || camp.patientsExpected
  const closeOut = camp.closeOut ?? {
    male: Math.round(patientsDone * 0.55),
    female: patientsDone - Math.round(patientsDone * 0.55),
    riskBands: {
      NORMAL: Math.round(patientsDone * 0.4),
      MILD: Math.round(patientsDone * 0.3),
      MODERATE: Math.round(patientsDone * 0.2),
      SEVERE: patientsDone - Math.round(patientsDone * 0.4) - Math.round(patientsDone * 0.3) - Math.round(patientsDone * 0.2),
    },
  }
  return { status: 'CLOSED', patientsDone, closeOut }
}

export function assignTeamPatch(camp: Camp | undefined, dietitianId: string, foId: string): Partial<Camp> {
  const resources = { ...(camp?.resources ?? {}), DIETITIAN: dietitianId, ...(foId ? { FO: foId } : {}) }
  return { dietitianId, ...(foId ? { foId } : {}), resources, status: camp?.status === 'REQUESTED' ? 'SCHEDULED' : camp?.status }
}

export function setConfirmationPatch(camp: Camp | undefined, slot: string, who: string, status: CampConfirmation['status']): Partial<Camp> {
  const confirmations = { ...(camp?.confirmations ?? {}), [`${slot}::${who}`]: { status, when: new Date().toISOString() } }
  return { confirmations }
}

export function recordConfirmationInReminderLog(campId: string, slot: string, who: string, status: CampConfirmation['status']): Record<string, CampReminderLog> {
  const reminders = load(KEYS.REMINDERS, {} as Record<string, CampReminderLog>)
  const log = reminders[campId] ?? ensureReminderLog()
  log[slot as keyof CampReminderLog][who as keyof CampReminderLog['T48']] = status
  reminders[campId] = log
  persist(KEYS.REMINDERS, reminders)
  return reminders
}

function ensureReminderLog(): CampReminderLog {
  const empty = () => ({ FO: 'PENDING', DIETITIAN: 'PENDING', LABTECH: 'PENDING', MANPOWER: 'PENDING', DOCTOR: 'PENDING' } as CampReminderLog['T48'])
  return { T48: empty(), T24: empty(), T2: empty() }
}

export async function sendAllReminders(campId: string): Promise<Record<string, CampReminderLog>> {
  const reminders = load(KEYS.REMINDERS, {} as Record<string, CampReminderLog>)
  const log = reminders[campId] ?? ensureReminderLog()
  for (const win of ['T48', 'T24', 'T2'] as const) {
    for (const who of Object.keys(log[win]) as (keyof CampReminderLog['T48'])[]) {
      if (log[win][who] === 'PENDING') log[win][who] = 'SENT'
    }
  }
  reminders[campId] = log
  persist(KEYS.REMINDERS, reminders)
  return reminders
}

export async function addMedia(campId: string, item: MediaItem): Promise<Record<string, MediaItem[]>> {
  const media = load(KEYS.MEDIA, {} as Record<string, MediaItem[]>)
  media[campId] = [...(media[campId] ?? []), item]
  persist(KEYS.MEDIA, media)
  return media
}

// Each saved assessment increments the camp's patientsDone by 1 (patient
// count for tele camps is driven by completed assessments, not a manual
// entry) — returns both the updated assessment log and the Camp patch to
// apply; caller supplies the current camp since this module doesn't read
// qms.master.camps itself.
export async function addAssessment(assessment: OnlineAssessment, camp: Camp | undefined): Promise<{ assessments: Record<string, OnlineAssessment[]>; campPatch: Partial<Camp> }> {
  const assessments = load(KEYS.ASSESSMENTS, {} as Record<string, OnlineAssessment[]>)
  assessments[assessment.campId] = [...(assessments[assessment.campId] ?? []), assessment]
  persist(KEYS.ASSESSMENTS, assessments)
  return { assessments, campPatch: { patientsDone: (camp?.patientsDone ?? 0) + 1 } }
}

export async function bookTeleConsult(consult: Omit<TeleConsult, 'id'>): Promise<TeleConsult[]> {
  const list = load(KEYS.TELECONSULTS, TELE_CONSULTS)
  const next = [...list, { ...consult, id: `TC-${2001 + list.length}` }]
  persist(KEYS.TELECONSULTS, next)
  return next
}

export async function setTeleConsultStatus(id: string, status: TeleConsultStatus, notes?: string, plan?: string): Promise<TeleConsult[]> {
  const list = load(KEYS.TELECONSULTS, TELE_CONSULTS)
  const next = list.map((t) => (t.id === id ? { ...t, status, ...(notes !== undefined ? { notes } : {}), ...(plan !== undefined ? { plan } : {}) } : t))
  persist(KEYS.TELECONSULTS, next)
  return next
}

