// An MR rates the camp's assigned worker once closed — three 0-5 sub-scores; `overall` is
// always server-derived, never accepted on create/update.

export interface RatingPopulatedRole { id: string; name: string; code: string }

export interface RatingEntity {
  id: string
  camp: string | null
  onTime: number
  attire: number
  communication: number
  /** Always the mean of onTime/attire/communication (1 decimal) — never accepted from a payload. */
  overall: number
  ratedBy: RatingPopulatedRole | null
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
  page?: string
  limit?: string
}
