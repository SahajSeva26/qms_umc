// Minimal slice of the real backend Camp contract this app needs — mirrors
// internal-frontend's campReal.types.ts; extend, don't widen ahead of need.

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

/** GET /camps/my's top-level summary — totals over the caller's own camps, independent of the current page/filter. */
export interface CampSummary {
  totalCamps: number
  statusCounts: { status: CampStatus; count: number }[]
  typeCounts: { type: CampType; count: number }[]
}

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
  /** Triggers the backend's per-row `stats` block (patients/patientsCompleted) alongside items. */
  report?: 'true' | 'false'
}

/** Frozen snapshot of who made this transition, captured at the moment it happened. */
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
export interface CampPopulatedProject { _id?: string; name: string; status?: string; tests?: string[] }
export interface CampPopulatedDoctor { _id?: string; name: string; specialization?: string; pharmaCode?: string }
/** fo/mr/asm/rsm populate with NO field projection — the full Role document comes back. */
export interface CampPopulatedRole { _id?: string; code: string; name: string; status?: string; [key: string]: unknown }
/** devices populates with a narrow projection (`select: 'name code type'`) — a fetched/searched camp's devices are these sub-docs, never bare id strings. */
export interface CampPopulatedDevice { _id: string; name: string; code: string; type: string }

export interface CampStats {
  patients: number
  patientsCompleted: number
}

export interface CampEntity {
  id: string
  code: string
  tenant?: CampPopulatedTenant | string
  division?: CampPopulatedDivision | string
  project: CampPopulatedProject | string | null
  doctor: CampPopulatedDoctor | string
  type: CampType
  billingType?: BillingType
  patientExpectation: number
  /** Screening/lab camps are staffed here; a diet camp is staffed via `dietitian` instead — only one applies, decided by `type`. */
  fo: CampPopulatedRole | string | null
  /** Diet-camp counterpart of `fo` — only one applies, by type. */
  dietitian: CampPopulatedRole | string | null
  mr: CampPopulatedRole | string | null
  asm?: CampPopulatedRole | string | null
  rsm?: CampPopulatedRole | string | null
  date: string
  timeSlot: CampTimeSlotValue | null
  /** Nullable — the backend mapper returns `camp.location || null`; legacy camps predating the location migration have none. */
  location: LocationValue | null
  devices?: CampPopulatedDevice[]
  notes?: string
  conscentPath?: string
  /** Free-form metadata bag — null unless set. */
  meta?: Record<string, unknown> | null
  status: CampStatus
  stageHistory: CampStageHistoryEntry[]
  createdAt: string
  updatedAt: string
  // Only present when the search was called with report=true — derived from the screening
  // collection (one Screening = one patient at this camp), not a stored Camp field.
  stats?: CampStats
}

/** Mutations (book/create/update/moveStage) return the unpopulated in-memory document — refetch
 * the camp for populated fields. Mirrors internal-frontend's CampMutationResponseEntity. */
export type CampMutationResponseEntity = Omit<CampEntity, 'devices'> & { devices: string[] }

/** Mirrors backend BookCampPayloadSchema. `mr` is always required, even for a self-booking MR.
 * No `fo`/`dietitian` override — booking auto-allocates the nearest free worker by `type`. */
export interface BookCampPayload {
  project: string
  mr: string
  doctor: string
  type?: CampType
  patientExpectation?: number
  /** YYYY-MM-DD — never a JS Date; the backend coerces the string itself. */
  date: string
  timeSlot: CampTimeSlotValue
  location: LocationValue
  devices?: string[]
  notes?: string
  conscentPath?: string
}

/** App-facing shape — `projectId` is translated to the backend's `projectID` spelling inside
 * pharmaCamps.service.ts only. */
export interface BookingAvailabilityPayload {
  projectId: string
  lat: number
  lng: number
  dateFrom: string
  dateTo: string
  /** Which worker kind to check availability for — defaults to 'screening' (FO) when omitted. */
  type?: CampType
}

export interface BookingAvailabilityDayEntry {
  /** Project-scoped — computed only over this project's own configured slots (see `slots`). */
  available: boolean
  /** Only the project's own configured slots are present (or all 4 if the project has none configured). */
  slots: Partial<Record<CampTimeSlotValue, boolean>>
}

export interface BookingAvailabilityResponse {
  eligibleFoCount: number
  dateFrom: string
  dateTo: string
  /** Keyed by YYYY-MM-DD — a map, not an array. */
  dates: Record<string, BookingAvailabilityDayEntry>
}
