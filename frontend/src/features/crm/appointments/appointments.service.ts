import type { Meeting, MeetingOutcome } from '@/types/meeting.types'
import { MEETINGS as SEED_MEETINGS } from '@/features/crm/appointments/appointments.mock'
import { isMomLate, workingHoursSince } from '@/features/crm/appointments/appointments.utils'

const STORAGE_KEY = 'qms.sales.meetings'
const MOM_DEADLINE_WORKING_HOURS = 24

function loadMeetings(): Meeting[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // fall through to seed
  }
  return JSON.parse(JSON.stringify(SEED_MEETINGS))
}

function persistMeetings(meetings: Meeting[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings))
  } catch {
    // demo persistence only — safe to ignore quota/serialization errors
  }
}

function patchMeeting(id: string, patch: (m: Meeting) => Meeting): Meeting[] {
  const next = loadMeetings().map((m) => (m.id === id ? patch(m) : m))
  persistMeetings(next)
  return next
}

// Auto-block sweep: any PLANNED meeting whose MOM is still missing more than
// 24 *working* hours (Sat/Sun skipped) after it ended becomes BLOCKED.
function sweepAutoBlock(meetings: Meeting[]): { swept: Meeting[]; changed: boolean } {
  let changed = false
  const now = new Date().toISOString()
  const swept: Meeting[] = meetings.map((m) => {
    if (m.status !== 'PLANNED' || m.momSubmittedAt) return m
    if (workingHoursSince(m.endAt) < MOM_DEADLINE_WORKING_HOURS) return m
    changed = true
    return {
      ...m,
      status: 'BLOCKED',
      blockedAt: now,
      blockReason: 'MOM not submitted within 24 working hours',
      updatedAt: now,
    }
  })
  return { swept, changed }
}

// TODO: replace with real API calls once backend endpoints exist
export async function getMeetings(): Promise<Meeting[]> {
  const { swept, changed } = sweepAutoBlock(loadMeetings())
  if (changed) persistMeetings(swept)
  return swept
}

// TODO: replace with real API calls once backend endpoints exist
export async function createMeeting(meeting: Meeting): Promise<Meeting[]> {
  const next = [...loadMeetings(), meeting]
  persistMeetings(next)
  return next
}

// TODO: replace with real API calls once backend endpoints exist
// Note: submitting the MOM alone never un-blocks a meeting — a BLOCKED meeting
// stays BLOCKED until it is explicitly released. PLANNED/RELEASED become DONE.
export async function submitMom(id: string, momText: string, nextSteps?: string): Promise<Meeting[]> {
  const now = new Date().toISOString()
  return patchMeeting(id, (m) => ({
    ...m,
    momText,
    momSubmittedAt: now,
    ...(nextSteps?.trim() ? { nextSteps } : {}),
    ...(m.status === 'PLANNED' || m.status === 'RELEASED' ? { status: 'DONE' as const } : {}),
    updatedAt: now,
  }))
}

// TODO: replace with real API calls once backend endpoints exist
export async function reschedule(id: string, startAt: string, endAt: string, reason: string): Promise<Meeting[]> {
  const now = new Date().toISOString()
  return patchMeeting(id, (m) => ({
    ...m,
    startAt,
    endAt,
    rescheduleHistory: [
      ...(m.rescheduleHistory ?? []),
      { from: { startAt: m.startAt, endAt: m.endAt }, to: { startAt, endAt }, reason, at: now },
    ],
    updatedAt: now,
  }))
}

export interface MarkDoneResult {
  ok: boolean
  error?: string
}

// TODO: replace with real API calls once backend endpoints exist
export async function markDone(id: string): Promise<MarkDoneResult> {
  const meetings = loadMeetings()
  const meeting = meetings.find((m) => m.id === id)
  if (!meeting) return { ok: false, error: 'Meeting not found' }
  if (!meeting.momSubmittedAt && (meeting.status === 'BLOCKED' || isMomLate(meeting))) {
    return { ok: false, error: 'MOM is overdue — submit the MOM before marking this meeting done' }
  }
  const now = new Date().toISOString()
  persistMeetings(meetings.map((m) => (m.id === id ? { ...m, status: 'DONE', updatedAt: now } : m)))
  return { ok: true }
}

// TODO: replace with real API calls once backend endpoints exist
export async function cancel(id: string): Promise<Meeting[]> {
  const now = new Date().toISOString()
  return patchMeeting(id, (m) => ({ ...m, status: 'CANCELLED', updatedAt: now }))
}

// TODO: replace with real API calls once backend endpoints exist
export async function setOutcome(id: string, outcome: MeetingOutcome, reason?: string): Promise<Meeting[]> {
  const now = new Date().toISOString()
  return patchMeeting(id, (m) => ({
    ...m,
    outcome,
    ...(reason?.trim() ? { outcomeReason: reason } : {}),
    status: 'DONE',
    updatedAt: now,
  }))
}

// TODO: replace with real API calls once backend endpoints exist
export async function releaseBlock(id: string, reason: string, releasedBy: string): Promise<Meeting[]> {
  const now = new Date().toISOString()
  return patchMeeting(id, (m) => ({
    ...m,
    status: 'RELEASED',
    releaseReason: reason,
    releasedBy,
    releasedAt: now,
    updatedAt: now,
  }))
}
