import type { LeadOffer, LeadProjectType } from '@/types/crm.types'

// Wizard form state shaped to build a real CreateLeadPayload (crm.types.ts)
// directly — no client-only fields carried through to submit. Picker ids
// (tenantId/divisionId/contactPersonId/salesPersonId) resolve to
// CreateLeadPayload's tenant/division/contactPerson/salesPerson respectively;
// the "*Label" companions exist only for review-step display since the
// picked entities aren't otherwise held in state.
export interface WizardFormState {
  // Step 1 — Pharma
  tenantId: string
  tenantLabel: string
  divisionId: string
  divisionLabel: string
  contactPersonId: string
  contactPersonLabel: string
  focusTherapy: string[]
  focusTherapyDoctor: string[]

  // Step 2 — Opportunity
  title: string
  problemStatement: string
  numberOfMRS: number
  currentlyDoing: string[]

  // Step 3 — QMS offer
  projectType: LeadProjectType | ''
  offers: LeadOffer[]

  // Step 4 — Commercial
  estimatedValue: number
  followUpDate: string
  confidence: number
  salesPersonId: string
  salesPersonLabel: string
}

export const DEFAULT_WIZARD_FORM: WizardFormState = {
  tenantId: '',
  tenantLabel: '',
  divisionId: '',
  divisionLabel: '',
  contactPersonId: '',
  contactPersonLabel: '',
  focusTherapy: [],
  focusTherapyDoctor: [],
  title: '',
  problemStatement: '',
  numberOfMRS: 0,
  currentlyDoing: [],
  projectType: '',
  offers: [],
  estimatedValue: 0,
  followUpDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  confidence: 50,
  salesPersonId: '',
  salesPersonLabel: '',
}

export function computeWizardScore(form: WizardFormState): number {
  let score = form.confidence
  if (form.estimatedValue > 5_000_000) score += 6
  if (form.estimatedValue > 1_000_000) score += 3
  if (form.problemStatement.length > 80) score += 4
  if (form.focusTherapyDoctor.length > 0) score += 2
  if (form.divisionId) score += 2
  return Math.max(5, Math.min(99, Math.round(score)))
}
