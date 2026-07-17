export interface WizardFormState {
  // Step 1 — Pharma
  pharmaCompanyName: string
  divisionName: string
  contact: string
  contactRole: string
  email: string
  phone: string
  focusTherapies: string[]
  focusDoctors: string[]
  focusDoctorOther: string
  brandNames: string[]

  // Step 2 — Opportunity
  subject: string
  problemStatement: string
  mrCount: number
  currentActivities: string[]
  currentActivityOther: string
  currentActivityNotes: string

  // Step 3 — QMS offer
  projectType: string
  qmsOffers: string[]
  qmsOfferDetails: Record<string, { sub: string; reason: string }>

  // Step 4 — Commercial
  estimatedValue: number
  nextFollowUpDate: string
  confidencePct: number
  owner: string
}

export const DEFAULT_WIZARD_FORM: WizardFormState = {
  pharmaCompanyName: '',
  divisionName: '',
  contact: '',
  contactRole: '',
  email: '',
  phone: '',
  focusTherapies: [],
  focusDoctors: [],
  focusDoctorOther: '',
  brandNames: [],
  subject: '',
  problemStatement: '',
  mrCount: 0,
  currentActivities: [],
  currentActivityOther: '',
  currentActivityNotes: '',
  projectType: '',
  qmsOffers: [],
  qmsOfferDetails: {},
  estimatedValue: 0,
  nextFollowUpDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  confidencePct: 50,
  owner: '',
}

export function computeWizardScore(form: WizardFormState): number {
  let score = form.confidencePct
  if (form.estimatedValue > 5_000_000) score += 6
  if (form.estimatedValue > 1_000_000) score += 3
  if (form.problemStatement.length > 80) score += 4
  if (form.focusDoctors.length > 0) score += 2
  if (form.divisionName) score += 2
  return Math.max(5, Math.min(99, Math.round(score)))
}
