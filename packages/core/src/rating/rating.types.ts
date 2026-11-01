// Mirrors backend/src/modules/operations/rating/**. An MR rates the camp's assigned worker
// (FO or dietitian, by camp.type) once the camp is closed — three 0-5 sub-scores, `overall` is
// always server-derived (never accepted on create/update).

export interface RatingPopulatedCamp { id: string; code: string; date: string; status: string; type: string }
export interface RatingPopulatedRole { id: string; name: string; code: string }
export interface RatingPopulatedTenant { id: string; name: string; code: string }

export interface RatingEntity {
  id: string
  camp: RatingPopulatedCamp | null
  /** The rated field worker (camp's fo or dietitian, by camp.type). */
  worker: RatingPopulatedRole | null
  /** The rater — the camp's MR. */
  ratedBy: RatingPopulatedRole | null
  tenant: RatingPopulatedTenant | null
  onTime: number
  attire: number
  communication: number
  /** Always the mean of onTime/attire/communication (1 decimal) — never accepted from a payload. */
  overall: number
  ratedAt: string
  createdAt: string
  updatedAt: string
}

/** worker/ratedBy/tenant are all derived server-side from the camp + acting MR — never supplied. */
export interface CreateRatingPayload {
  camp: string
  onTime: number
  attire: number
  communication: number
}

/** camp/worker/ratedBy/tenant are immutable — only the three sub-scores can change; overall re-derives. */
export interface UpdateRatingPayload {
  onTime?: number
  attire?: number
  communication?: number
}

export interface SearchRatingQuery {
  camp?: string
  worker?: string
  /** Only honoured for a rating:manage actor — others are own-scoped server-side regardless. */
  ratedBy?: string
  /** Only honoured for a rating:manage actor not already tenant-pinned. */
  tenant?: string
  page?: string
  limit?: string
}
