// Real backend-integrated Camp types — mirrors backend/src/modules/operations/camp/**.
// Deliberately separate from `camp.types.ts`, the old mock model ~100 files still depend on.

import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import type { LocationValue } from '@/types/location.types'

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

/** get()/search() populate; create/update/moveStage/allocateFo return bare ObjectIds. */
export interface CampPopulatedTenant { _id?: string; code: string; name: string }
export interface CampPopulatedDivision { _id?: string; code: string; name: string; therapy?: string }
// tests is the Project's configured Test Master id list, not automatically
// "relevant to this camp" — see TestRecordingSection.tsx's campType filter.
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
  /** Screening/lab camps are staffed here; a diet camp is staffed via `dietitian` instead — only one applies, decided by `type`. */
  fo: CampPopulatedRole | string | null
  /** Diet-camp counterpart of `fo` — only one applies, by type. */
  dietitian: CampPopulatedRole | string | null
  mr: CampPopulatedRole | string | null
  asm: CampPopulatedRole | string | null
  rsm: CampPopulatedRole | string | null
  date: string
  timeSlot: CampTimeSlotValue | null
  /** Nullable — the backend mapper returns `camp.location || null`; legacy camps predating the location migration have none. */
  location: LocationValue | null
  /** Always populated sub-docs on a genuinely fetched camp — see CampMutationResponseEntity below for the mutation-response exception. */
  devices: CampPopulatedDevice[]
  notes?: string
  conscentPath?: string
  /** Free-form metadata bag — null unless set. A void camp requires meta.mailUrl (its execution basis is a pharma confirmation mail, not a PO). */
  meta: Record<string, unknown> | null
  status: CampStatus
  stageHistory: CampStageHistoryEntry[]
  createdAt: string
  updatedAt: string
  // Only present when the search was called with report=true — derived from the screening
  // collection (one Screening = one patient at this camp), not a stored Camp field.
  stats?: CampStats
}

export interface CampStats {
  patients: number
  patientsCompleted: number
}

/** create/update/moveStage/allocateFo return the unpopulated document — only
 * `devices` differs from CampEntity (bare ObjectId strings, not sub-docs). */
export type CampMutationResponseEntity = Omit<CampEntity, 'devices'> & { devices: string[] }

export interface SearchCampQuery {
  code?: string
  tenant?: string
  project?: string
  division?: string
  doctor?: string
  fo?: string
  dietitian?: string
  status?: CampStatus
  type?: CampType
  billingType?: BillingType
  city?: string
  state?: string
  dateFrom?: string
  dateTo?: string
  page?: string
  limit?: string
  // When 'true', each item gets a `stats` object (see CampStats).
  report?: 'true' | 'false'
}

export interface CreateCampPayload {
  tenant: string
  division: string
  project?: string
  doctor: string
  type?: CampType
  billingType?: BillingType
  patientExpectation?: number
  /** Optional — when omitted, the backend best-effort auto-assigns the nearest available worker (FO or dietitian, by `type`) from `coordinates`; the camp still creates unassigned if none can be resolved. */
  fo?: string
  /** Diet-camp counterpart of `fo` — only one applies, by `type`; supplying the wrong one for the camp's type 400s. */
  dietitian?: string
  /** Required. asm/rsm are no longer accepted — the backend derives them server-side from this MR's own supervisor chain (resolveMrChain). */
  mr: string
  date: string
  timeSlot: CampTimeSlotValue
  location: LocationValue
  /** Each entry must be an existing InventoryMaster ObjectId — the backend 404s on any miss. */
  devices?: string[]
  notes?: string
  conscentPath?: string
}

/** Mirrors VoidCampPayloadSchema (WF-4) — an internal-team record of a camp executed WITHOUT a PO,
 * on the basis of a pharma confirmation mail. Deliberately skips the normal create() lifecycle: no FO
 * auto-allocation, no slot-clash check, no auto-confirm; the camp lands in `requested` for later
 * reconciliation via a separate approve-void call. `billingType` is NOT accepted — the backend forces
 * it to 'void'. `mr` is optional (a void camp is often standalone). */
export interface VoidCampPayload {
  tenant: string
  division: string
  project?: string
  doctor: string
  type?: CampType
  patientExpectation?: number
  mr?: string
  date: string
  timeSlot: CampTimeSlotValue
  location: LocationValue
  devices?: string[]
  notes?: string
  conscentPath?: string
  /** Required — mailUrl is the void camp's execution basis and must be a non-empty string. */
  meta: { mailUrl: string } & Record<string, unknown>
}

/** Mirrors ApproveVoidCampPayloadSchema — the only update a void camp allows, moving it
 * requested → closed. The approver + timestamp come from the stageHistory entry itself. */
export interface ApproveVoidCampPayload {
  reason: string
}

/** Mirrors BookCampPayloadSchema — the pharma field-force booking path.
 * tenant/division/asm/rsm are all server-derived from the target MR's own supervisor chain. */
export interface BookCampPayload {
  project: string
  /** Required — every booker (including an MR booking for themselves) must name the MR explicitly. */
  mr: string
  doctor: string
  /** No `fo`/`dietitian` override field exists here — pharma booking always auto-allocates the nearest free worker (FO or dietitian, by `type`). */
  type?: CampType
  patientExpectation?: number
  date: string
  timeSlot: CampTimeSlotValue
  location: LocationValue
  devices?: string[]
  notes?: string
  conscentPath?: string
}

export interface UpdateCampPayload {
  doctor?: string
  /** No `type` field — the backend's UpdateCampPayloadSchema has none at all; type is immutable after create (it decides the camp's worker kind). A supplied type is silently stripped, not rejected. */
  billingType?: BillingType
  patientExpectation?: number
  /** All fields here are locked once status !== 'requested' — the backend 409s the whole update, not just fo/date. */
  fo?: string
  /** Diet-camp counterpart of `fo` — see CreateCampPayload. */
  dietitian?: string
  /** asm/rsm are no longer accepted — the backend re-derives them from this MR whenever it's set. */
  mr?: string
  date?: string
  timeSlot?: CampTimeSlotValue
  /** Optional, replace-wholesale — omitting it preserves whatever location the camp already has (including a legacy null). */
  location?: LocationValue
  devices?: string[]
  notes?: string
  conscentPath?: string
}

export interface MoveCampStagePayload {
  to: CampStatus
  reason: string
}

/** App-facing shape for POST /camps/booking-availability — `projectId`
 * (not the backend's required `projectID` spelling) and `[lng, lat]`
 * are translated to the wire shape inside campsReal.service.ts only. */
export interface BookingAvailabilityPayload {
  projectId: string
  lat: number
  lng: number
  /** YYYY-MM-DD — never a JS Date; the backend coerces the string itself. */
  dateFrom: string
  dateTo: string
  /** Which worker kind to check availability for — defaults to 'screening' (FO) when omitted; pass 'diet' to check dietitian availability instead. */
  type?: CampType
}

export interface BookingAvailabilityDayEntry {
  /** Project-scoped — computed only over this project's own configured slots (see `slots`). */
  available: boolean
  /** Only the project's own configured slots are present (or all 4 if the project has none configured) — not every CampTimeSlotValue is guaranteed. */
  slots: Partial<Record<CampTimeSlotValue, boolean>>
}

export interface BookingAvailabilityResponse {
  eligibleFoCount: number
  dateFrom: string
  dateTo: string
  /** Keyed by YYYY-MM-DD — a map, not an array. */
  dates: Record<string, BookingAvailabilityDayEntry>
}
