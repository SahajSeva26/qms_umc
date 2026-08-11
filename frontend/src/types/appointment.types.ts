// Appointment domain types — mirrors the real backend exactly:
// backend/src/modules/crm/appointment/{appointment.model,appointment.constants,appointment.validators}.ts

export type AppointmentType = 'new' | 'follow-up' | 'payment' | 'spot'
export type AppointmentMode = 'online' | 'offline' | 'call'
// blocked/released removed 2026-08-11 per client request — the backend is
// dropping both statuses too, so this is a coordinated removal, not a
// frontend-only hide.
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

// salesPerson/contactPerson/internalMembers.role populate with NO `select`
// in appointment.service.ts (unlike tenant/division/lead/parent, which use
// a narrow projection) — same real backend over-fetch pattern already
// documented on Lead's contactPerson/salesPerson (crm.types.ts's
// LeadPopulatedRole). Do not widen further; only read fields actually needed.
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

// contactPerson refs the Contact module (not Role) — populated with no
// `select`, so the full ContactEntity shape (minus the `id` alias, since raw
// Mongoose populate uses `_id`) is available.
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
  // Populated {AppointmentPopulatedRole} on GET-by-id/search (both always
  // populate — appointment.service.ts's search() calls .populate()
  // unconditionally, same quirk as Lead's own search(); get() is always
  // called with {populate:true} by the controller). Raw ObjectId string only
  // in a create/update response's echo before a follow-up GET.
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
  // Defined on the model but never actually set anywhere in
  // appointment.service.ts today — always undefined in practice.
  submittedAt?: string
  // Derived server-side (24 working hours after duration.endTime) —
  // never client-settable, see CreateAppointmentPayloadSchema's comment.
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
  nextSteps?: string
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
// tenant/division/contactPerson/startTime are the only hard-required fields;
// endTime/agenda/mom/mode/nextSteps/internalMembers/lead/parent are all optional.
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
  nextSteps?: string
}

// tenant/division/salesPerson/parent/status are NOT editable here — status
// only ever moves through moveStage().
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
  nextSteps?: string
}

export interface MoveAppointmentStagePayload {
  to: AppointmentStatus
  reason: string
}

// pending is the initial system state — a member can only respond
// accepted/declined, never back to pending.
export interface RespondAppointmentPayload {
  status: Extract<AppointmentInviteStatus, 'accepted' | 'declined'>
  note?: string
}
