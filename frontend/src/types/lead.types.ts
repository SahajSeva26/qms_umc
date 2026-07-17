// Mirrors the vanilla-JS prototype's crm-data.js / crm.js / crm-sales-leads.js shapes.
// TODO: entirely mock/frontend-only — no backend endpoints exist for CRM yet.
//
// IMPORTANT: leads and "opportunities" are NOT separate entities in the real
// prototype (confirmed via code research) — there is one flat Lead object with
// a `stage` field. Despite docs/crm.md describing separate DB tables, the
// actual UI/data model never implements that split. We follow the real code.

export type LeadStage = 'new' | 'quotation' | 'negotiation' | 'won' | 'lost'

export interface StageMeta {
  id: LeadStage
  name: string
  desc: string
  color: string
}

// Stage/lost-category tables live here (not crm.mock.ts) so any feature can
// read lead-pipeline domain metadata through the shared types layer instead
// of reaching into the CRM feature's internal mock file.
//
// Confirmed via code research: the real Kanban has 4 active columns —
// `lost` is spliced out of the board (still exists as a stage value on leads,
// just has no dedicated column), contradicting docs/crm.md's "6 columns" claim.
export const STAGES: StageMeta[] = [
  { id: 'new', name: 'Lead Generation', desc: 'Newly captured, unqualified', color: '#3b6dff' },
  { id: 'quotation', name: 'Quotation', desc: 'Assessment + proposal sent', color: '#f59e0b' },
  { id: 'negotiation', name: 'Negotiation', desc: 'Terms under discussion', color: '#8b5cf6' },
  { id: 'won', name: 'Won', desc: 'PO received', color: '#10b981' },
]

export const LOST_STAGE: StageMeta = { id: 'lost', name: 'Loss', desc: 'Lost or disqualified', color: '#f43f5e' }

export const LOST_CATEGORIES = [
  'Pricing mismatch', 'Lost to competitor', 'Bad timing/deferred', 'Scope misalignment',
  'Serviceability/geo gap', 'No response/ghosted', 'Budget unavailable', 'Other',
]

export interface StageHistoryEntry {
  from: LeadStage
  to: LeadStage
  reason: string
  at: string
}

export interface Lead {
  id: string
  account: string
  contact: string
  contactRole: string
  email: string
  phone: string
  division: string
  therapy: string
  brand: string
  targetDoctors: number
  existingActivity: string
  currentVendor: string
  problem: string
  geography: string
  city: string
  state: string
  competitor: string
  value: number
  stage: LeadStage
  score: number
  owner: string
  ownerInitials: string
  ownerTone: string
  ownerRole: string
  age: number
  nextAction: string
  nextDue: string
  source: string
  created: string
  updated: string
  tags: string[]
  stageHistory?: StageHistoryEntry[]

  // Fields only present on leads created via the New Lead wizard
  subject?: string
  problemStatement?: string
  pharmaCompanyName?: string
  divisionName?: string
  focusTherapies?: string[]
  focusDoctors?: string[]
  focusDoctorOther?: string
  brandNames?: string[]
  mrCount?: number
  currentActivities?: string[]
  currentActivityOther?: string
  currentActivityNotes?: string
  projectType?: string
  qmsOffers?: string[]
  qmsOfferDetails?: Record<string, { sub: string; reason: string }>
  estimatedValue?: number
  confidencePct?: number
  nextFollowUpDate?: string

  // Lost-lead fields
  lostReason?: string
  lostCategory?: string
}

export interface Owner {
  name: string
  initials: string
  tone: string
  role: string
}

export interface KpiTile {
  id: string
  label: string
  tone: string
  icon: string
  fmt: 'inr' | 'num' | 'pct' | 'raw'
  value: number | string
  delta: number
  sub?: string
}
