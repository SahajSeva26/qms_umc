// Mirrors the vanilla-JS prototype's camps-data.js / camps.js / camp-detail.js shapes.
// TODO: entirely mock/frontend-only — no backend endpoints exist for camps yet.

export type CampType = 'Screening' | 'Diet' | 'Lab'

// Raw statuses that actually exist on camp records. Colors are the REAL values
// from camps-data.js's CAMP_STATUSES table — these differ from the (stale)
// color mapping in CLAUDE.md §8, which does not match the prototype's code.
export type CampStatus = 'REQUESTED' | 'CONFIRMED' | 'SCHEDULED' | 'LIVE' | 'CLOSED' | 'CANCELLED' | 'CANCELLED_CHARGED'

// Derived UI bucket — NOT the same as `status`. Drives the 9 list tabs/KPIs.
export type CampStage = 'REQUESTED' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'COMPLETED_PENDING' | 'CANCELLED' | 'CANCELLED_CHARGED'

export interface Doctor {
  id: string
  code: string
  name: string
  specialty: string
  email: string
  phone: string
  city: string
  state: string
  pincode: string
  gmap?: string
}

export interface CampRating {
  overall?: number
  onTime?: number
  attire?: number
  communication?: number
  ratedBy?: string
  ratedAt?: string
}

// Post-camp clinical close-out summary — only present on some closed camps
// (mirrors the prototype's camps-data.js closeOut sub-object).
export interface CampCloseOut {
  male?: number
  female?: number
  riskBands?: {
    NORMAL?: number
    MILD?: number
    MODERATE?: number
    SEVERE?: number
  }
}

// Team-assignment bag — mirrors diet-camps.js's canonical `resources` shape
// (used for Diet camps' Dietitian/LabTech/Manpower team, alongside the
// legacy top-level `foId`).
export interface CampResources {
  FO?: string
  DIETITIAN?: string
  LABTECH?: string
  MANPOWER?: string[]
}

// Reminder-confirmation entry, keyed `${slot}::${who}` on Camp.confirmations
// (diet-camps.js's dual-write alongside the qms.diet.reminders log).
export interface CampConfirmation {
  status: 'PENDING' | 'SENT' | 'CONFIRMED' | 'DECLINED' | 'NO_RESPONSE'
  when: string
}

export interface CampCancellationPolicySnapshot {
  freeHoursPrior: number
  pctDeducted: number
  unitCost: number
}

// OM·Diet's suggestion for the Diet Camp Coordinator to approve — mirrors
// om-data.js's dietitianProposal shape exactly. OM never assigns directly.
export interface CampDietitianProposal {
  suggestedDietitianId: string
  suggestedDietitianName: string
  suggestedAt: string
  suggestedBy: string
  reasons: string[]
  score: number
  status: 'SUGGESTED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedAt?: string
  reviewedBy?: string
}

// Structured cancellation record — mirrors diet-camps.js's dcCancelCamp()
// (distinct from the flat cancelReason/cancelledAt fields Camp Management's
// simpler cancel flow still uses — see PROGRESS.md Known Issues).
export interface CampCancellation {
  when: string
  reason: 'DIETITIAN_UNAVAILABLE' | 'WEATHER' | 'LOW_TURNOUT' | 'CLIENT_REQUEST' | 'RESCHEDULED' | 'OTHER'
  notes: string
  hoursBefore: number
  chargeAmount: number
  policy: CampCancellationPolicySnapshot
}

export interface Camp {
  id: string
  date: string
  slot: string
  type: CampType
  status: CampStatus
  clientId: string
  projectId?: string
  divisionId?: string | null
  doctorId: string
  city: string
  state: string
  foId?: string
  foName?: string
  dietitianId?: string
  patientsExpected: number
  patientsDone: number
  devicesAllocated: string[]
  rxCount: number
  feedback: number
  foRating: number
  consentUrl?: string
  notes?: string

  // Runtime-added fields (set via wizard / bulk import / lifecycle actions)
  teleConsult?: boolean
  teleChannel?: 'VIDEO' | 'IVR'
  mrId?: string
  mrName?: string
  asmName?: string
  rsmRegion?: string
  cancelReason?: string
  cancelledAt?: string
  cancelledBy?: string
  thirdParty?: boolean
  executedBy?: string
  source?: 'BULK_HISTORICAL'
  doctorName?: string

  // Detail-only fields (never set by list/wizard, only present if seeded)
  photos?: string[]
  photoUrl?: string
  patientCount?: number
  submissionCompleted?: boolean
  coordinatorId?: string
  coordId?: string
  resources?: CampResources
  requestedAt?: string
  confirmations?: Record<string, CampConfirmation>
  cancellation?: CampCancellation
  patientCountBy?: string
  patientCountNote?: string
  patientCountAt?: string
  /** Reopen-approval restarts the diet-submission-token's 24h window by
   * bumping this (mirrors om-data.js's ensureSubmissionTokenForCamp/
   * approveTokenReopen) — the token/lock workflow itself isn't built yet,
   * only this field exists so ReopenRequestsTab's approve action has
   * somewhere real to write. */
  tokenActivatedAt?: string
  dietitianProposal?: CampDietitianProposal
  checkInAt?: string
  checkOutAt?: string
  completedAt?: string
  bookedAt?: string
  address?: string
  gmapLink?: string
  rating?: CampRating
  mrAvailable?: boolean
  mrAvailabilityHrs?: number
  doctorAvailabilityHrs?: number
  mrFeedback?: string
  mrFeedbackRating?: number
  incidentReport?: string
  audit?: { at: string; note: string }[]
  extraEfforts?: string[]
  foRemarks?: string[]
  closeOut?: CampCloseOut
}

export interface CampStatusMeta {
  id: CampStatus
  name: string
  color: string
}

export interface CampTypeMeta {
  id: CampType
  name: string
  icon: string
  color: string
}

export interface SlotMeta {
  id: string
  label: string
}

// Promoted here (not features/camps/camps.mock.ts) so other features (Diet
// Camps) can read the booking-slot reference data through the shared types
// layer instead of reaching into Camp Management's internals — same
// pattern as the CLIENTS/DIVISIONS/STAGES promotions.
export const SLOTS: SlotMeta[] = [
  { id: '9-1', label: '9 AM – 1 PM' },
  { id: '10-2', label: '10 AM – 2 PM' },
  { id: '11-3', label: '11 AM – 3 PM' },
  { id: '6-10', label: '6 PM – 10 PM' },
]
