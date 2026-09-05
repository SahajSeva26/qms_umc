// Real backend-integrated Camp types — mirrors backend/src/modules/operations/camp/**.
// Deliberately separate from `camp.types.ts`, the old mock model ~100 files still depend on.

import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'

export const CAMP_TYPE_VALUES = ['screening', 'diet', 'lab'] as const
export type CampType = (typeof CAMP_TYPE_VALUES)[number]

export const CAMP_TYPE_LABEL: Record<CampType, string> = {
  screening: 'Screening',
  diet: 'Diet',
  lab: 'Lab',
}

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

/** Whether a field is populated or a bare ObjectId depends on the service call: get()/search() populate, create/update/moveStage/allocateFo don't. */
export interface CampPopulatedTenant { _id?: string; code: string; name: string }
export interface CampPopulatedDivision { _id?: string; code: string; name: string; therapy?: string }
// tests is the Project's configured Test Master id list — not automatically
// "relevant to this camp" on its own, see TestRecordingSection.tsx's
// campType-compatibility filter for what makes it so.
export interface CampPopulatedProject { _id?: string; name: string; status?: string; tests?: string[] }
export interface CampPopulatedDoctor { _id?: string; name: string; specialization?: string; pharmaCode?: string }
/** fo/mr/asm/rsm populate with NO field projection (`{ path: 'fo' }`, no `.select()`) — the full Role document comes back. */
export interface CampPopulatedRole { _id?: string; code: string; name: string; status?: string; [key: string]: unknown }
/** devices populates with a narrow projection (`select: 'name code type'`) — a fetched/searched camp's devices are these sub-docs, never bare id strings. */
export interface CampPopulatedDevice { _id: string; name: string; code: string; type: string }

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
  timeSlot: CampTimeSlotValue | null
  city: string
  state: string
  coordinates: CampCoordinates | null
  /** Always populated sub-docs on a genuinely fetched camp — see CampMutationResponseEntity below for the mutation-response exception. */
  devices: CampPopulatedDevice[]
  notes?: string
  conscentPath?: string
  status: CampStatus
  stageHistory: CampStageHistoryEntry[]
  createdAt: string
  updatedAt: string
}

/**
 * create()/bookCamp()/update()/moveStage()/allocateFo() return the unpopulated
 * Mongoose document straight from `.save()` — only `devices` differs from
 * CampEntity (bare ObjectId strings, not {_id,name,code,type} sub-docs);
 * fetch/refetch for the real shape.
 */
export type CampMutationResponseEntity = Omit<CampEntity, 'devices'> & { devices: string[] }

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
  /** Required. asm/rsm are no longer accepted — the backend derives them server-side from this MR's own supervisor chain (resolveMrChain). */
  mr: string
  date: string
  timeSlot: CampTimeSlotValue
  city: string
  state: string
  coordinates: CampCoordinates
  /** Each entry must be an existing InventoryMaster ObjectId — the backend 404s on any miss. */
  devices?: string[]
  notes?: string
  conscentPath?: string
}

/** Mirrors BookCampPayloadSchema — the pharma field-force booking path.
 * tenant/division/asm/rsm are all server-derived from the target MR's own supervisor chain. */
export interface BookCampPayload {
  project: string
  /** Required — every booker (including an MR booking for themselves) must name the MR explicitly. */
  mr: string
  doctor: string
  type?: CampType
  patientExpectation?: number
  date: string
  timeSlot: CampTimeSlotValue
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
  /** All fields here are locked once status !== 'requested' — the backend 409s the whole update, not just fo/date. */
  fo?: string
  /** asm/rsm are no longer accepted — the backend re-derives them from this MR whenever it's set. */
  mr?: string
  date?: string
  timeSlot?: CampTimeSlotValue
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
