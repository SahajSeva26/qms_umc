// Minimal slice of the real backend Project contract this app needs for MR booking — trimmed,
// no executionMode/goLiveScope/stageHistory. Extend, don't widen ahead of need.

import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import type { CampType } from '@/types/campReal.types'

// Array-valued field — a project can be more than one type at once (that's how "mixed" is
// expressed; the backend dropped a separate `mixed` value since `type` is already an array).
export type ProjectType = 'screening' | 'diet' | 'lab' | 'teleconsultation_diet'

// `teleconsultation_diet` maps to an EMPTY array, not `['diet']` — the backend has no matching
// camp type, so that project offering hosts no physical camp at all.
export const PROJECT_TYPE_CAMP_TYPES: Record<ProjectType, CampType[]> = {
  screening: ['screening'],
  diet: ['diet'],
  lab: ['lab'],
  teleconsultation_diet: [],
}

export function allowedCampTypesForProjectTypes(types: ProjectType[] | undefined | null): CampType[] {
  return [...new Set((types ?? []).flatMap((t) => PROJECT_TYPE_CAMP_TYPES[t]))]
}

// Every project starts at `new` server-side and only moves via PATCH /projects/:id/stage.
export type ProjectStatus = 'new' | 'live' | 'hold' | 'closed'

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  new: 'New',
  live: 'Live',
  hold: 'Hold',
  closed: 'Closed',
}

// Not defined server-side — one consistent swatch per status for pills.
export const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  new: '#3b6dff',
  live: '#10b981',
  hold: '#f59e0b',
  closed: '#94a3b8',
}

export type WhoCanBookCampCode = 'pharma-division-head' | 'pharma-asm' | 'pharma-rsm' | 'pharma-mr'

/** Project.tests[] populates with only `name code therapy`, never `consumption` — the
 * devices-required card resolves that separately via GET /projects/:id/requirements. */
export interface ProjectPopulatedTest { _id?: string; name?: string; code?: string; therapy?: string }

export interface ProjectEntity {
  id: string
  name: string
  code: string
  status: ProjectStatus
  type: ProjectType[]
  whoCanBookCamp: WhoCanBookCampCode[]
  campTimeSlots: CampTimeSlotValue[]
  daysToBookBefore: number
  tests: (ProjectPopulatedTest | string)[]
}

export interface SearchProjectQuery {
  name?: string
  status?: ProjectStatus
  page?: string
  limit?: string
}
