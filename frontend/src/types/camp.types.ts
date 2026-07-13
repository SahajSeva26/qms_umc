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
  resources?: Record<string, unknown>
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
