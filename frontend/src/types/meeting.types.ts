// Mirrors the vanilla-JS prototype's sales appointments / calendar shapes.
// TODO: entirely mock/frontend-only — no backend endpoints exist for meetings yet.

export type MeetingType = 'NEW' | 'FOLLOWUP' | 'PAYMENT' | 'SPOT'

export type MeetingStatus = 'PLANNED' | 'DONE' | 'CANCELLED' | 'BLOCKED' | 'RELEASED'

export type MeetingOutcome = 'CONVERTED_LEAD' | 'NOT_RESPONDING' | 'NOT_INTERESTED' | 'WILL_UPDATE_LATER'

export type MeetingMode = 'IN_PERSON' | 'VIRTUAL'

export interface MeetingOwner {
  id: string
  name: string
  tone: string
}

export interface RescheduleEntry {
  from: { startAt: string; endAt: string }
  to: { startAt: string; endAt: string }
  reason: string
  at: string
}

export interface Meeting {
  id: string
  meetingNo?: string
  ownerId: string
  ownerName: string
  ownerTone: string
  type: MeetingType
  status: MeetingStatus
  pharmaCompanyId: string
  pharmaName: string
  divisionName?: string
  contactName: string
  contactRole?: string
  city?: string
  location?: string
  modeOfMeeting?: MeetingMode
  /** ISO datetime strings */
  startAt: string
  endAt: string
  agendaPublic: string
  agendaPrivate?: string
  nextSteps?: string
  linkedLeadId?: string
  momText?: string
  momSubmittedAt?: string
  outcome?: MeetingOutcome
  outcomeReason?: string
  blockedAt?: string
  blockReason?: string
  releasedBy?: string
  releasedAt?: string
  releaseReason?: string
  rescheduleHistory?: RescheduleEntry[]
  createdAt: string
  updatedAt: string
}

export interface MeetingTypeMeta {
  name: string
  color: string
}

export interface MeetingStatusMeta {
  name: string
  color: string
}

export const MEETING_TYPE_META: Record<MeetingType, MeetingTypeMeta> = {
  NEW: { name: 'New', color: '#3b6dff' },
  FOLLOWUP: { name: 'Follow-up', color: '#14b8a6' },
  PAYMENT: { name: 'Payment', color: '#f59e0b' },
  SPOT: { name: 'Spot', color: '#a855f7' },
}

export const MEETING_STATUS_META: Record<MeetingStatus, MeetingStatusMeta> = {
  PLANNED: { name: 'Planned', color: '#3b6dff' },
  DONE: { name: 'Done', color: '#10b981' },
  CANCELLED: { name: 'Cancelled', color: '#94a3b8' },
  BLOCKED: { name: 'Blocked', color: '#f43f5e' },
  RELEASED: { name: 'Released', color: '#a855f7' },
}

export const MEETING_OUTCOME_META: Record<MeetingOutcome, { name: string; hint: string; color: string }> = {
  CONVERTED_LEAD: { name: 'Converted to lead', hint: 'Interest confirmed — push into the CRM pipeline', color: '#10b981' },
  NOT_RESPONDING: { name: 'Not responding', hint: 'Contact went silent after the meeting', color: '#94a3b8' },
  NOT_INTERESTED: { name: 'Not interested', hint: 'Clear no — park the account for now', color: '#94a3b8' },
  WILL_UPDATE_LATER: { name: 'Will update later', hint: 'Decision still pending on the client side', color: '#94a3b8' },
}
