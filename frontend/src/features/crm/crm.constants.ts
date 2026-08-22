import type { DivisionTherapy, LeadStatus, LeadProjectType } from '@/features/crm/crm.types'

// Shared option lists used by both the New Lead wizard and the Edit Lead
// modal — extracted here so the edit form doesn't duplicate (and risk
// drifting from) the wizard's own lists. None of these are backend-defined
// enums; they're free-text chip values the prototype's own wizard used.

export const THERAPIES = [
  'Cardiology', 'Diabetes', 'Pulmonology', 'Neurology', 'Orthopedics', 'Gynecology',
  'Gastroenterology', 'Dermatology', 'Nephrology', 'Oncology',
]

export const SPECIALTIES = [
  'Cardiologist', 'Endocrinologist', 'Pulmonologist', 'Neurologist', 'Orthopedic', 'Gynecologist',
  'Gastroenterologist', 'Dermatologist', 'Nephrologist', 'Oncologist', 'GP', 'CP',
]

export const CURRENT_ACTIVITIES = [
  'Doctor meets', 'Diet camps', 'PSP', 'Combination', 'CME/RTM events', 'Digital campaigns',
  'Field force reach', 'Sample distribution', 'Teleconsultation', 'Screening camps', 'None',
]

// Offering identifiers sent as LeadOffer.code — no backend-defined catalog
// exists for these, so the code is a stable slug derived from the label.
export const QMS_OFFERINGS: { code: string; label: string }[] = [
  { code: 'screening_camp', label: 'Screening Camp' },
  { code: 'diet_camp', label: 'Diet Camp' },
  { code: 'lab_camp', label: 'Lab Camp' },
  { code: 'teleconsultation', label: 'Teleconsultation' },
  { code: 'whatsapp_bot', label: 'WhatsApp Bot' },
  { code: 'field_officer_deployment', label: 'Field Officer Deployment' },
  { code: 'device_rental', label: 'Device Rental' },
  { code: 'patient_reminder_engine', label: 'Patient Reminder Engine' },
]

// Runtime label/color/transition-map constants for the Division/Lead
// domain — split out of crm.types.ts so type declarations aren't bundled
// with runtime values.

export const DIVISION_THERAPY_LABEL: Record<DivisionTherapy, string> = {
  cardiology: 'Cardiology',
  diabetes: 'Diabetes',
  pulmonology: 'Pulmonology',
  endocrine: 'Endocrine',
  orthopedics: 'Orthopedics',
  gynaecology: 'Gynaecology',
  neurology: 'Neurology',
  hepatology: 'Hepatology',
  nephrology: 'Nephrology',
  ophthalmology: 'Ophthalmology',
  dermatology: 'Dermatology',
  oncology: 'Oncology',
  pediatrics: 'Pediatrics',
  wellness: 'Wellness',
}

// The only legal `to` values from a given current `status`. `won`/`lost` are
// terminal — there is no reopen path via this API.
export const LEAD_TRANSITION_MAP: Record<LeadStatus, LeadStatus[]> = {
  new: ['qualified'],
  qualified: ['proposal', 'lost'],
  proposal: ['pilot', 'negotiation', 'lost'],
  pilot: ['negotiation', 'won', 'lost'],
  negotiation: ['won', 'lost'],
  won: [],
  lost: [],
}

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  pilot: 'Pilot',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

// Not backend-defined — one consistent swatch per status for the UI.
export const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  new: '#3b6dff',
  qualified: '#0ea5e9',
  proposal: '#f59e0b',
  pilot: '#8b5cf6',
  negotiation: '#ec4899',
  won: '#10b981',
  lost: '#f43f5e',
}

export const LEAD_PROJECT_TYPE_LABEL: Record<LeadProjectType, string> = {
  screening: 'Screening',
  diet: 'Diet',
  tele_diet: 'Tele-Diet',
  lab: 'Lab',
  mixed: 'Mixed',
}
