// Real backend-integrated Camp types — mirrors the actual backend contract:
// backend/src/modules/operations/camp/{camp.model,camp.constants,camp.validators,camp.mapper}.ts
//
// Deliberately a SEPARATE file from `camp.types.ts` (the old, much richer
// mock/localStorage model still used by ~100 files across HQ/Analytics/Diet/
// FO/OM/etc.) — those dependents are not part of this wiring pass and must
// keep compiling against the old shape untouched. Only `features/camps/**`
// (the Camp Management feature itself) is rebuilt against this file.
//
// The real backend model is much thinner than the old mock: no teleconsult,
// no close-out capture, no reminders, no resource-assignment beyond fo/mr/
// asm/rsm, no per-patient screening data. fo/mr/asm/rsm are real Role
// references (not free-text name strings), tenant/division are server-
// derived and immutable, and status only ever moves through a dedicated
// stage-transition endpoint with a required reason — never via create/update.

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

export interface CampStageHistoryEntry {
  from: CampStatus
  to: CampStatus
  reason: string
  createdBy: string
  createdAt: string
}

/**
 * CampMapper.toResponse itself never destructures nested relations — it just
 * assigns `camp.tenant`/`camp.division`/etc. straight through. But whether
 * that value is a bare ObjectId string or a populated object depends on
 * whether the SERVICE call populated the document before mapping:
 * camp.service.ts's get()/search() DO pass `{ populate: true }` and populate
 * tenant/division/project/doctor/fo/mr/asm/rsm — confirmed via a live API
 * round-trip, contrary to a first read of the mapper alone — while create()/
 * update()/moveStage()/allocateFo() never populate, so those responses echo
 * back bare ObjectId strings for the same fields. Every link field is
 * therefore a real populated-or-string union, same duality pattern as
 * Role/Division/Project's own entities elsewhere in this app.
 */
export interface CampPopulatedTenant { _id?: string; code: string; name: string }
export interface CampPopulatedDivision { _id?: string; code: string; name: string; therapy?: string }
export interface CampPopulatedProject { _id?: string; name: string; status?: string }
export interface CampPopulatedDoctor { _id?: string; name: string; specialization?: string; pharmaCode?: string }
/** fo/mr/asm/rsm populate with NO field projection (`{ path: 'fo' }`, no `.select()`) — the full Role document comes back. */
export interface CampPopulatedRole { _id?: string; code: string; name: string; status?: string; [key: string]: unknown }

export interface CampEntity {
  id: string
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
  /** Optional — when omitted, the backend auto-assigns the nearest available FO from `coordinates`; creation fails (422/409) if none can be resolved. */
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
