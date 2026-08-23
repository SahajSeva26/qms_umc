// Appointment domain types — mirrors the real backend exactly:
// backend/src/modules/crm/appointment/{appointment.model,appointment.constants,appointment.validators}.ts

export type AppointmentType = 'new' | 'follow-up' | 'payment' | 'spot'
export type AppointmentMode = 'online' | 'offline' | 'call'
export type AppointmentStatus = 'planned' | 'done' | 'cancelled'
export type AppointmentInviteStatus = 'pending' | 'accepted' | 'declined'

// Keyed by current status, same shape/purpose as LEAD_TRANSITION_MAP in
// crm.types.ts — planned is the entry point, done/cancelled are terminal.
export const APPOINTMENT_TRANSITION_MAP: Record<AppointmentStatus, AppointmentStatus[]> = {
  planned: ['done', 'cancelled'],
  done: [],
  cancelled: [],
}

export const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
  new: 'New',
  'follow-up': 'Follow-up',
  payment: 'Payment',
  spot: 'Spot',
}

export const APPOINTMENT_MODE_LABEL: Record<AppointmentMode, string> = {
  online: 'Online',
  offline: 'In-person',
  call: 'Call',
}

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  planned: 'Planned',
  done: 'Done',
  cancelled: 'Cancelled',
}

export interface AppointmentPopulatedTenant {
  _id?: string
  name: string
  code: string
}

export interface AppointmentPopulatedDivision {
  _id?: string
  name: string
  code: string
  therapy: string
}

// salesPerson/contactPerson/internalMembers.role populate with no `select` (full-document over-fetch).
// Do not widen further; only read fields actually needed.
export interface AppointmentPopulatedRole {
  _id?: string
  code: string
  name: string
  description?: string
  permissions: string[]
  status: string
  type: string
  user: string
  tenant: string
}

// contactPerson refs the Contact module (not Role); raw Mongoose populate uses `_id`, not the `id` alias.
export interface AppointmentPopulatedContact {
  _id?: string
  tenant: string
  name: string
  designation?: string
  email?: string
  phone?: string
  location?: string
  type: string
  user: unknown
  status: string
}

export interface AppointmentPopulatedLead {
  _id?: string
  code: string
  title: string
  status: string
}

export interface AppointmentPopulatedParent {
  _id?: string
  code: string
  type: AppointmentType
  status: AppointmentStatus
}

export interface AppointmentInternalMember {
  // Always populated on GET-by-id/search; raw ObjectId string only in a create/update echo.
  role: AppointmentPopulatedRole | string
  status: AppointmentInviteStatus
  note?: string
  createdAt: string
  updatedAt: string
}

export interface AppointmentStageHistoryActor {
  roleId?: string
  name?: string
  email?: string
}

export interface AppointmentStageHistoryEntry {
  from: AppointmentStatus
  to: AppointmentStatus
  reason: string
  // Captured per-transition, not as a standalone field — every stage move
  // carries its own next step (appointment.model.ts's stageHistorySchema).
  nextSteps?: string
  actor: AppointmentStageHistoryActor
  createdAt: string
}

export interface AppointmentDuration {
  startTime: string
  endTime?: string
}

export interface AppointmentAgenda {
  public?: string
  private?: string
}

export interface AppointmentMom {
  details?: string
  // Defined on the model but never actually set server-side today.
  submittedAt?: string
  // Derived server-side (24 working hours after duration.endTime); never client-settable.
  submissionDeadline?: string
}

export interface AppointmentEntity {
  id: string
  code: string
  tenant: AppointmentPopulatedTenant | string
  division: AppointmentPopulatedDivision | string
  type: AppointmentType
  salesPerson: AppointmentPopulatedRole | string
  contactPerson: AppointmentPopulatedContact | string
  internalMembers: AppointmentInternalMember[]
  lead?: AppointmentPopulatedLead | string
  parent?: AppointmentPopulatedParent | string
  mode: AppointmentMode
  destinationLink?: string
  duration: AppointmentDuration
  agenda: AppointmentAgenda
  status: AppointmentStatus
  mom: AppointmentMom
  // No top-level nextSteps field exists — it only ever lives inside stageHistory[].nextSteps.
  stageHistory: AppointmentStageHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export interface SearchAppointmentQuery {
  status?: AppointmentStatus
  type?: AppointmentType
  mode?: AppointmentMode
  division?: string
  lead?: string
  salesPerson?: string
  contactPerson?: string
  // ISO date strings — dateTo is snapped to end-of-UTC-day server-side.
  dateFrom?: string
  dateTo?: string
  page?: string
  limit?: string
}

// salesPerson is NOT accepted — auto-set to the creator in the service.
// nextSteps only exists on the move-stage payload (see MoveAppointmentStagePayload).
export interface CreateAppointmentPayload {
  tenant: string
  division: string
  type: AppointmentType
  contactPerson: string
  // Plain role ids — the service maps each into an invite (defaulting to pending).
  internalMembers?: string[]
  lead?: string
  parent?: string
  mode?: AppointmentMode
  destinationLink?: string
  startTime: string
  endTime?: string
  agenda?: AppointmentAgenda
  mom?: { details?: string }
}

// tenant/division/salesPerson/parent/status are NOT editable here — status only moves via moveStage().
// nextSteps is not accepted here either; sending it is a no-op.
export interface UpdateAppointmentPayload {
  type?: AppointmentType
  contactPerson?: string
  internalMembers?: string[]
  lead?: string
  mode?: AppointmentMode
  destinationLink?: string
  startTime?: string
  endTime?: string
  agenda?: AppointmentAgenda
  mom?: { details?: string }
}

export interface MoveAppointmentStagePayload {
  to: AppointmentStatus
  reason: string
  // Captured together with this transition — the ONLY write path nextSteps
  // actually has (MoveStagePayloadSchema on the backend).
  nextSteps?: string
}

// pending is the initial system state — a member can only respond
// accepted/declined, never back to pending.
export interface RespondAppointmentPayload {
  status: Extract<AppointmentInviteStatus, 'accepted' | 'declined'>
  note?: string
}
