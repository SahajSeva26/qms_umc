// Mirrors the vanilla-JS prototype's camps-data.js / camps.js / camp-detail.js shapes.
// TODO: entirely mock/frontend-only — no backend endpoints exist for camps yet.

export type CampType = 'Screening' | 'Diet' | 'Lab'

// Raw statuses that actually exist on camp records. Colors are the REAL values
// from camps-data.js's CAMP_STATUSES table — these differ from the (stale)
// color mapping in CLAUDE.md §8, which does not match the prototype's code.
// COMPLETE/COMPLETE_WITHOUT_REPORT/INCOMPLETE are the Run Camp wizard's own
// closure outcomes (fo-camp-run.js's computeFinalStatus) — distinct from the
// simpler CLOSED status Camp Management's own close-out flow sets directly.
export type CampStatus =
  | 'REQUESTED' | 'CONFIRMED' | 'SCHEDULED' | 'LIVE' | 'CLOSED' | 'CANCELLED' | 'CANCELLED_CHARGED'
  | 'COMPLETE' | 'COMPLETE_WITHOUT_REPORT' | 'INCOMPLETE'

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
  // DOCTOR_UNAVAILABLE is Camp Management's variant (camps-manager.js's
  // cancelCamp reason select); DIETITIAN_UNAVAILABLE is Diet Camps' own
  // (diet-camps.js's dcCancelCamp) — kept as siblings, neither renamed.
  reason: 'DIETITIAN_UNAVAILABLE' | 'DOCTOR_UNAVAILABLE' | 'WEATHER' | 'LOW_TURNOUT' | 'CLIENT_REQUEST' | 'RESCHEDULED' | 'OTHER'
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
  /** Dietitian post-camp submission payload (photos uploaded via the
   * submission-link flow) — a fallback photo source alongside the top-level
   * `photos` field, mirrors om-data.js's isReportComplete() checking both. */
  submissionData?: { photos?: string[] }
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
  /** Dietitian post-camp data-submission link token — mirrors om-data.js's
   * submissionToken/submissionUrl pair used by the Diet Coord Workspace's
   * reopen-request flow and Dietitian Payment's "View camps" submission link. */
  submissionToken?: string
  submissionUrl?: string
  reopenRequests?: import('@/features/diet/dietitians.types').CampReopenRequest[]
  dietitianProposal?: CampDietitianProposal
  /** Coord-set rates for this camp's dietitian assignment — mirrors
   * om-data.js's camp.dietitianRates, read by dietitianExpense()'s priority
   * chain ahead of the dietitian's rate history / master defaults. */
  dietitianRates?: { remuneration?: number; ta?: number; printing?: number; targetCost?: number }
  /** Estimated one-way travel distance (km) for the assigned dietitian —
   * feeds dietitianExpense()'s TA fallback (₹9/km) when no explicit rate is set. */
  foDistanceKm?: number
  /** Flat TA override, independent of dietitianRates.ta (om-data.js's
   * camp.taAmount fallback, checked before rate-history/travel-estimate). */
  taAmount?: number
  /** Tests/screenings this camp conducts — drives campRequiresBca()'s
   * BCA-camp detection (matches /\bBCA\b|body\s*comp|composition|fat\s*analys/i). */
  tests?: string[]
  testsConducted?: string[]
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

  // Run Camp wizard fields (fo-camp-run.js) — kept as separate fields rather
  // than reusing the similarly-named ones above, since those are already
  // consumed with different shapes by Camp Management's own dossier/close-out
  // flow (mrAvailable is a boolean there; the wizard's is a free-text select
  // string like 'Available — full day'). Same pattern as the
  // DIETITIAN_UNAVAILABLE/DOCTOR_UNAVAILABLE sibling-not-rename precedent.
  closedAt?: string
  statusReason?: string
  checkInDelayMins?: number
  checkInDelayReason?: string
  checkInGeo?: { lat: number; lng: number; accuracy?: number } | null
  selfieDataUrl?: string
  setupPhotos?: Record<string, string>
  additionalPhotos?: Record<string, string>
  closurePhoto?: string
  wastage?: { consumableId: string; qty: number; reason: string }[]
  extraConsumables?: { consumableId: string; qty: number; reason: string }[]
  consumableDeductions?: { consumableId: string; qty: number }[]
  selectedLots?: string[]
  screeningResults?: RunCampScreeningResult[]
  runSummary?: RunCampSummary
  foReportUploadedAt?: string
  criticalFindings?: number
  runFoRemarks?: string
  runMrAvailable?: string
  runMrAvailabilityHrs?: string
  runDoctorAvailabilityHrs?: string
  runMrFeedbackRating?: number
  runMrFeedback?: string
  runIncidentReport?: string
}

// Camp master/seed data lives here (not camps.mock.ts) so other features
// (e.g. inventory, for its camp-driven consumption forecast) can read it
// through the shared types layer instead of reaching into Camp Management's
// internal mock file — same pattern as the CLIENTS/DIVISIONS/SLOTS promotions.
function dPlus(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
}

export const CAMPS: Camp[] = [
  { id: 'C-9421', date: dPlus(0), slot: '10-2', type: 'Screening', status: 'LIVE', clientId: 'cli-sun', projectId: 'PRJ-441', divisionId: 'div-sun-cardio', doctorId: 'doc-001', city: 'Mumbai', state: 'MH', foId: 'p-ravi', patientsExpected: 60, patientsDone: 28, devicesAllocated: ['dev-bp', 'dev-spo', 'dev-ecg'], rxCount: 0, feedback: 0, foRating: 0, consentUrl: '/consents/c9421.pdf', notes: 'Andheri W clinic · cardiology focus' },
  { id: 'C-9425', date: dPlus(2), slot: '9-1', type: 'Screening', status: 'REQUESTED', clientId: 'cli-cipla', projectId: 'PRJ-432', divisionId: 'div-cipla-resp', doctorId: 'doc-007', city: 'Chennai', state: 'TN', foId: '', patientsExpected: 45, patientsDone: 0, devicesAllocated: ['dev-spirom', 'dev-spo'], rxCount: 0, feedback: 0, foRating: 0, consentUrl: '', notes: 'Pulmo focus · awaits FO assignment' },
  { id: 'C-9418', date: dPlus(-1), slot: '10-2', type: 'Screening', status: 'CLOSED', clientId: 'cli-sun', projectId: 'PRJ-441', divisionId: 'div-sun-cardio', doctorId: 'doc-001', city: 'Mumbai', state: 'MH', foId: 'p-ravi', patientsExpected: 60, patientsDone: 64, devicesAllocated: ['dev-bp', 'dev-spo', 'dev-ecg'], rxCount: 42, feedback: 4.6, foRating: 4.7, consentUrl: '/consents/c9418.pdf', notes: 'Closed · 64 screened', photos: ['/photos/c9418-1.jpg', '/photos/c9418-2.jpg'], patientCount: 64, submissionCompleted: true, checkInAt: `${dPlus(-1)}T10:00:00`, checkOutAt: `${dPlus(-1)}T14:20:00`, rating: { overall: 4.7, onTime: 5, attire: 5, communication: 4 }, closeOut: { male: 27, female: 37, riskBands: { NORMAL: 38, MILD: 16, MODERATE: 8, SEVERE: 2 } } },
  { id: 'C-9415', date: dPlus(-3), slot: '10-2', type: 'Screening', status: 'CANCELLED_CHARGED', clientId: 'cli-glenmark', projectId: 'PRJ-435', divisionId: 'div-glen-derm', doctorId: 'doc-005', city: 'Mumbai', state: 'MH', foId: '', patientsExpected: 35, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, consentUrl: '', notes: 'Cancelled <24h · charged', cancelReason: 'Doctor unavailable at short notice', cancelledAt: dPlus(-3) },
  { id: 'C-9414', date: dPlus(-2), slot: '9-1', type: 'Screening', status: 'CANCELLED', clientId: 'cli-lupin', projectId: 'PRJ-429', divisionId: null, doctorId: 'doc-010', city: 'Delhi', state: 'DL', foId: '', patientsExpected: 30, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, consentUrl: '', notes: 'Rescheduled at client request', cancelReason: 'Client requested reschedule', cancelledAt: dPlus(-2) },
  { id: 'C-9430', date: dPlus(4), slot: '11-3', type: 'Diet', status: 'CONFIRMED', clientId: 'cli-cipla', projectId: 'PRJ-438', divisionId: 'div-cipla-endo', doctorId: 'doc-002', city: 'Bengaluru', state: 'KA', foId: 'p-anita', dietitianId: 'diet-01', patientsExpected: 40, patientsDone: 0, devicesAllocated: ['dev-glucometer'], rxCount: 0, feedback: 0, foRating: 0, consentUrl: '', notes: 'Diet camp · BCA pending' },
  { id: 'C-9431', date: dPlus(1), slot: '10-2', type: 'Diet', status: 'LIVE', clientId: 'cli-cipla', projectId: 'PRJ-438', divisionId: 'div-cipla-endo', doctorId: 'doc-002', city: 'Bengaluru', state: 'KA', foId: 'p-anita', dietitianId: 'diet-01', patientsExpected: 38, patientsDone: 12, devicesAllocated: ['dev-glucometer'], rxCount: 0, feedback: 0, foRating: 0, notes: 'Diet camp live' },
  { id: 'C-9433', date: dPlus(-4), slot: '10-2', type: 'Diet', status: 'CLOSED', clientId: 'cli-cipla', projectId: 'PRJ-438', divisionId: 'div-cipla-endo', doctorId: 'doc-002', city: 'Bengaluru', state: 'KA', foId: 'p-anita', dietitianId: 'diet-01', patientsExpected: 40, patientsDone: 41, devicesAllocated: ['dev-glucometer'], rxCount: 18, feedback: 4.4, foRating: 4.5, notes: 'Closed · 41 counselled', photos: ['/photos/c9433-1.jpg'], patientCount: 41, submissionCompleted: true, rating: { overall: 4.5 }, closeOut: { male: 19, female: 22, riskBands: { NORMAL: 24, MILD: 11, MODERATE: 5, SEVERE: 1 } }, mrId: 'mr-cipla-endo-1', mrName: 'Divya Hegde', coordinatorId: 'p-tushar' },
  // Extra Diet camps — Diet Coord Workspace / Dietitian Payment / Dietitian
  // Profiles need a wider spread of pharma/city/status/payment-state
  // combinations than the original 2 seeded Diet camps provided.
  { id: 'C-9452', date: dPlus(-9), slot: '9-1', type: 'Diet', status: 'CLOSED', clientId: 'cli-cipla', projectId: 'PRJ-438', divisionId: 'div-cipla-endo', doctorId: 'doc-002', city: 'Bengaluru', state: 'KA', foId: 'p-anita', dietitianId: 'diet-01', patientsExpected: 35, patientsDone: 36, devicesAllocated: ['dev-glucometer'], rxCount: 14, feedback: 4.6, foRating: 4.6, notes: 'Closed · report submitted, awaiting payment', photos: ['/photos/c9452-1.jpg'], patientCount: 36, submissionCompleted: true, rating: { overall: 4.6 }, mrId: 'mr-cipla-endo-1', mrName: 'Divya Hegde', coordinatorId: 'p-tushar' },
  { id: 'C-9453', date: dPlus(-18), slot: '10-2', type: 'Diet', status: 'CLOSED', clientId: 'cli-cipla', projectId: 'PRJ-438', divisionId: 'div-cipla-endo', doctorId: 'doc-002', city: 'Bengaluru', state: 'KA', foId: 'p-anita', dietitianId: 'diet-01', patientsExpected: 42, patientsDone: 44, devicesAllocated: ['dev-glucometer'], rxCount: 20, feedback: 4.3, foRating: 4.4, notes: 'Closed · already paid', photos: ['/photos/c9453-1.jpg'], patientCount: 44, submissionCompleted: true, rating: { overall: 4.3 }, mrId: 'mr-cipla-endo-1', mrName: 'Divya Hegde', coordinatorId: 'p-tushar' },
  { id: 'C-9454', date: dPlus(6), slot: '11-3', type: 'Diet', status: 'REQUESTED', clientId: 'cli-cipla', projectId: 'PRJ-438', divisionId: 'div-cipla-endo', doctorId: 'doc-002', city: 'Chennai', state: 'TN', foId: '', patientsExpected: 45, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, notes: 'Diet camp · awaiting dietitian assignment', mrId: 'mr-cipla-resp-1', mrName: 'Arjun Reddy', coordinatorId: 'p-tushar' },
  { id: 'C-9455', date: dPlus(3), slot: '9-1', type: 'Diet', status: 'CONFIRMED', clientId: 'cli-cipla', projectId: 'PRJ-432', divisionId: 'div-cipla-resp', doctorId: 'doc-007', city: 'Chennai', state: 'TN', foId: 'p-pooja', dietitianId: 'diet-02', patientsExpected: 30, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, notes: 'Diet camp confirmed', mrId: 'mr-cipla-resp-1', mrName: 'Arjun Reddy', coordinatorId: 'p-tushar' },
  { id: 'C-9456', date: dPlus(-2), slot: '10-2', type: 'Diet', status: 'CLOSED', clientId: 'cli-cipla', projectId: 'PRJ-432', divisionId: 'div-cipla-resp', doctorId: 'doc-007', city: 'Chennai', state: 'TN', foId: 'p-pooja', dietitianId: 'diet-02', patientsExpected: 32, patientsDone: 33, devicesAllocated: [], rxCount: 10, feedback: 3.6, foRating: 4.0, notes: 'Closed · feedback below threshold', photos: ['/photos/c9456-1.jpg'], patientCount: 33, submissionCompleted: true, rating: { overall: 3.6 }, mrId: 'mr-cipla-resp-1', mrName: 'Arjun Reddy', coordinatorId: 'p-tushar' },
  { id: 'C-9457', date: dPlus(9), slot: '9-1', type: 'Diet', status: 'REQUESTED', clientId: 'cli-abbott', projectId: 'PRJ-448', divisionId: 'div-abt-diab', doctorId: 'doc-004', city: 'Mumbai', state: 'MH', foId: '', patientsExpected: 50, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, tests: ['Body Composition Analysis', 'Blood Sugar'], notes: 'BCA-scale diet camp · awaiting dietitian assignment', mrId: 'mr-abt-diab-1', mrName: 'Rohit Malhotra', coordinatorId: 'p-tushar' },
  { id: 'C-9458', date: dPlus(-6), slot: '11-3', type: 'Diet', status: 'CLOSED', clientId: 'cli-abbott', projectId: 'PRJ-448', divisionId: 'div-abt-diab', doctorId: 'doc-004', city: 'Mumbai', state: 'MH', foId: 'p-amit', dietitianId: 'diet-03', patientsExpected: 28, patientsDone: 30, devicesAllocated: [], rxCount: 9, feedback: 4.1, foRating: 4.2, tests: ['Body Composition Analysis'], notes: 'BCA camp closed · report pending upload', patientCount: 0, mrId: 'mr-abt-diab-1', mrName: 'Rohit Malhotra', coordinatorId: 'p-tushar' },
  { id: 'C-9459', date: dPlus(-12), slot: '9-1', type: 'Diet', status: 'CLOSED', clientId: 'cli-abbott', projectId: 'PRJ-448', divisionId: 'div-abt-diab', doctorId: 'doc-004', city: 'Mumbai', state: 'MH', foId: 'p-amit', dietitianId: 'diet-03', patientsExpected: 25, patientsDone: 26, devicesAllocated: [], rxCount: 8, feedback: 4.4, foRating: 4.3, notes: 'Closed · locked submission, reopen requested', patientCount: 0, tokenActivatedAt: dPlus(-13), submissionToken: 'TKN-C9459-DEMO', mrId: 'mr-abt-diab-1', mrName: 'Rohit Malhotra', coordinatorId: 'p-tushar', reopenRequests: [{ id: 'RR-9459-1', campId: 'C-9459', reason: 'Clinic wifi was down for 2 days, could not upload patient photos in time', requestedAt: dPlus(-11), requestedBy: 'Farah Sheikh', status: 'PENDING' }] },
  { id: 'C-9460', date: dPlus(-25), slot: '10-2', type: 'Diet', status: 'CANCELLED', clientId: 'cli-cipla', projectId: 'PRJ-438', divisionId: 'div-cipla-endo', doctorId: 'doc-002', city: 'Bengaluru', state: 'KA', foId: '', patientsExpected: 30, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, notes: 'Cancelled · dietitian unavailable', cancelReason: 'Dietitian unavailable', cancelledAt: dPlus(-25), mrId: 'mr-cipla-endo-1', mrName: 'Divya Hegde', coordinatorId: 'p-tushar' },
  { id: 'C-9440', date: dPlus(5), slot: '9-1', type: 'Lab', status: 'REQUESTED', clientId: 'cli-abbott', projectId: 'PRJ-437', divisionId: 'div-abt-diab', doctorId: 'doc-004', city: 'Mumbai', state: 'MH', foId: '', patientsExpected: 50, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, notes: 'Lab camp · lab-tech TBD' },
  { id: 'C-9441', date: dPlus(3), slot: '10-2', type: 'Lab', status: 'CONFIRMED', clientId: 'cli-abbott', projectId: 'PRJ-437', divisionId: 'div-abt-diab', doctorId: 'doc-004', city: 'Mumbai', state: 'MH', foId: 'p-amit', patientsExpected: 45, patientsDone: 0, devicesAllocated: ['dev-lipid'], rxCount: 0, feedback: 0, foRating: 0, notes: 'Lab camp confirmed' },
  { id: 'C-9445', date: dPlus(-1), slot: '11-3', type: 'Screening', status: 'CLOSED', clientId: "cli-drreddys", projectId: 'PRJ-440', divisionId: 'div-drr-onco', doctorId: 'doc-003', city: 'Chennai', state: 'TN', foId: 'p-amit', patientsExpected: 55, patientsDone: 51, devicesAllocated: ['dev-bp', 'dev-spo'], rxCount: 22, feedback: 4.2, foRating: 4.3, notes: 'Closed but data pending', photos: [], patientCount: 0, closeOut: { male: 24, female: 27, riskBands: { NORMAL: 30, MILD: 13, MODERATE: 6, SEVERE: 2 } } },
  { id: 'C-9450', date: dPlus(6), slot: '6-10', type: 'Screening', status: 'REQUESTED', clientId: 'cli-sun', projectId: 'PRJ-441', divisionId: 'div-sun-cardio', doctorId: 'doc-001', city: 'Mumbai', state: 'MH', foId: '', teleConsult: true, teleChannel: 'VIDEO', patientsExpected: 25, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, notes: 'Teleconsultation camp' },
  { id: 'C-9451', date: dPlus(7), slot: '9-1', type: 'Screening', status: 'CONFIRMED', clientId: 'cli-glenmark', projectId: 'PRJ-435', divisionId: 'div-glen-derm', doctorId: 'doc-005', city: 'Mumbai', state: 'MH', foId: 'p-pooja', patientsExpected: 30, patientsDone: 0, devicesAllocated: ['dev-derm'], rxCount: 0, feedback: 0, foRating: 0, notes: 'Upcoming derm camp' },
  { id: 'C-9408', date: dPlus(-5), slot: '10-2', type: 'Screening', status: 'CANCELLED', clientId: 'cli-fortis', projectId: 'PRJ-422', divisionId: null, doctorId: 'doc-006', city: 'Pune', state: 'MH', foId: '', patientsExpected: 20, patientsDone: 0, devicesAllocated: [], rxCount: 0, feedback: 0, foRating: 0, notes: 'Fortis paused engagement', cancelReason: 'Account on hold', cancelledAt: dPlus(-5) },
]

export interface RunCampScreeningResult {
  patientCode: string
  name: string
  age: number
  gender: string
  results: Record<string, { value: string | number; level?: string; message?: string }>
  criticalFinding: boolean
  referredToDoctor: boolean
  at: string
}

export interface RunCampSummary {
  totalPatients: number
  genderBreakdown: { M: number; F: number; O: number }
  criticalFindings: number
  doctorReferrals: number
  testCounts: Record<string, number>
  consumableTotals: Record<string, number>
  wastageEntries: number
  extraConsumableEntries: number
  additionalPhotoCount: number
  delayMins?: number
  delayReason?: string
  generatedAt: string
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
