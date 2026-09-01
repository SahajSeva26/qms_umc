// Matches backend/operations/screening exactly. Screening is the Camp<->Patient
// join, tenant-scoped (tenant derived from the camp). One-way workflow:
// pending -> completed | cancelled, changed only via moveStage.

export type ScreeningStatus = 'pending' | 'completed' | 'cancelled'

export const SCREENING_STATUS_LABEL: Record<ScreeningStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

interface ScreeningPopulatedRef {
  id: string
}

export interface ScreeningPopulatedPatient extends ScreeningPopulatedRef {
  code: string
  firstName: string
  middleName?: string
  lastName?: string
  mobile: string
}

export interface ScreeningPopulatedCamp extends ScreeningPopulatedRef {
  code: string
  date: string
  status: string
}

export interface ScreeningPopulatedRole extends ScreeningPopulatedRef {
  name?: string
  code?: string
}

export interface ScreeningPopulatedTenant extends ScreeningPopulatedRef {
  name: string
  code: string
}

// The OTP itself is deliberately absent from this type — the backend never
// returns it in any response (see md-files/TODO.md's OTP-delivery entry).
// There is no interactive OTP entry UI in this feature until that's resolved.
export interface ScreeningConsent {
  verified: boolean
  signature?: string
}

export interface ScreeningStageHistoryEntry {
  from?: ScreeningStatus
  to: ScreeningStatus
  reason?: string
  actor: { roleId?: string; name?: string; email?: string } | null
  at: string
}

export interface ScreeningEntity {
  id: string
  tenant: ScreeningPopulatedTenant | null
  patient: ScreeningPopulatedPatient | null
  camp: ScreeningPopulatedCamp | null
  performedBy: ScreeningPopulatedRole | null
  symptoms: string[]
  referral: boolean
  consent: ScreeningConsent | null
  status: ScreeningStatus
  stageHistory: ScreeningStageHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export interface SearchScreeningQuery {
  patient?: string
  camp?: string
  status?: ScreeningStatus
  referral?: boolean
  // manage-only — a non-manage actor is always own-scoped regardless
  performedBy?: string
  tenant?: string
  page?: string
  limit?: string
}

// tenant is derived from the camp — never supplied. performedBy is pinned
// server-side to the camp's assigned FO. consent.otp is generated server-side.
export interface CreateScreeningPayload {
  patient: string
  camp: string
  symptoms?: string[]
  referral?: boolean
  signature?: string
}

// patient/camp/tenant/performedBy are immutable; consent flows through
// verify-consent (not wired, see above); status flows through moveStage only.
export interface UpdateScreeningPayload {
  symptoms?: string[]
  referral?: boolean
}

export interface MoveScreeningStagePayload {
  to: ScreeningStatus
  reason: string
}
