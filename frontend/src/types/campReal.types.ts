// Real backend-integrated Camp types — mirrors backend/src/modules/operations/camp/**.
// Deliberately separate from `camp.types.ts`, the old mock model ~100 files still depend on.

export type CampType = 'screening' | 'diet' | 'lab'
export type BillingType = 'billable' | 'void'
export type CampStatus = 'requested' | 'confirmed' | 'live' | 'closed' | 'cancelled' | 'cancelled_charged'

/** CAMP_TRANSITION_MAP mirrored exactly from camp.constants.ts — the only legal next stages per status. */
export const CAMP_TRANSITION_MAP: Record<CampStatus, CampStatus[]> = {
  requested: ['confirmed', 'cancelled', 'cancelled_charged'],
  confirmed: ['live', 'cancelled', 'cancelled_charged'],
  live: ['closed', 'cancelled_charged'],
  closed: [],
  cancelled: [],
  cancelled_charged: [],
}

export interface CampTimeSlot {
  start: string
  end: string
}

/** [longitude, latitude] — GeoJSON order, matches camp.validators.ts's CoordinatesSchema tuple. */
export type CampCoordinates = [number, number]

/** Frozen snapshot of who made this transition, captured at the moment it happened — stays accurate even if that person's name/role later changes. */
export interface CampStageActor {
  roleId?: string
  name?: string
  email?: string
}

export interface CampStageHistoryEntry {
  from: CampStatus
  to: CampStatus
  reason: string
  actor: CampStageActor
  createdAt: string
}

/** CampMapper passes nested relations through untouched — whether a field is
 * populated or a bare ObjectId depends on the service call: get()/search() populate, create/update/moveStage/allocateFo don't. */
export interface CampPopulatedTenant { _id?: string; code: string; name: string }
export interface CampPopulatedDivision { _id?: string; code: string; name: string; therapy?: string }
export interface CampPopulatedProject { _id?: string; name: string; status?: string }
export interface CampPopulatedDoctor { _id?: string; name: string; specialization?: string; pharmaCode?: string }
/** fo/mr/asm/rsm populate with NO field projection (`{ path: 'fo' }`, no `.select()`) — the full Role document comes back. */
export interface CampPopulatedRole { _id?: string; code: string; name: string; status?: string; [key: string]: unknown }

export interface CampEntity {
  id: string
  code: string
  tenant: CampPopulatedTenant | string
  division: CampPopulatedDivision | string
  project: CampPopulatedProject | string | null
  doctor: CampPopulatedDoctor | string
  type: CampType
  billingType: BillingType
  patientExpectation: number
  fo: CampPopulatedRole | string | null
  mr: CampPopulatedRole | string | null
  asm: CampPopulatedRole | string | null
  rsm: CampPopulatedRole | string | null
  date: string
  timeSlot: CampTimeSlot | null
  city: string
  state: string
  coordinates: CampCoordinates | null
  devices: string[]
  notes?: string
  conscentPath?: string
  status: CampStatus
  stageHistory: CampStageHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export interface SearchCampQuery {
  project?: string
  division?: string
  doctor?: string
  fo?: string
  status?: CampStatus
  type?: CampType
  billingType?: BillingType
  city?: string
  state?: string
  dateFrom?: string
  dateTo?: string
  page?: string
  limit?: string
}

export interface CreateCampPayload {
  tenant: string
  division: string
  project?: string
  doctor: string
  type?: CampType
  billingType?: BillingType
  patientExpectation?: number
  /** Optional — when omitted, the backend best-effort auto-assigns the nearest FO from `coordinates`; the camp still creates with no FO if none can be resolved. */
  fo?: string
  mr?: string
  asm?: string
  rsm?: string
  date: string
  timeSlot: CampTimeSlot
  city: string
  state: string
  coordinates: CampCoordinates
  devices?: string[]
  notes?: string
  conscentPath?: string
}

/** Mirrors BookCampPayloadSchema — the pharma field-force booking path.
 * tenant/division/asm/rsm are all server-derived from the target MR's own supervisor chain. */
export interface BookCampPayload {
  project: string
  /** Omit entirely when the caller IS the MR — the backend defaults to self. */
  mr?: string
  doctor: string
  type?: CampType
  patientExpectation?: number
  date: string
  timeSlot: CampTimeSlot
  city: string
  state: string
  coordinates: CampCoordinates
  devices?: string[]
  notes?: string
  conscentPath?: string
}

export interface UpdateCampPayload {
  doctor?: string
  type?: CampType
  billingType?: BillingType
  patientExpectation?: number
  /** Locked once status !== 'requested' — changing fo (or date) on a non-requested camp throws 409. */
  fo?: string
  mr?: string
  asm?: string
  rsm?: string
  date?: string
  timeSlot?: CampTimeSlot
  city?: string
  state?: string
  coordinates?: CampCoordinates
  devices?: string[]
  notes?: string
  conscentPath?: string
}

export interface MoveCampStagePayload {
  to: CampStatus
  reason: string
}
