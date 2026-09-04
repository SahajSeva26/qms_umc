import { describe, it, expect } from 'vitest'
import { createDefaultWizardForm } from '@/features/projects/wizard.types'
import { createProjectWizardSchema, editProjectWizardSchema, CREATE_STEP_FIELD_NAMES } from './project.schemas'

// A minimally-valid full wizard form, used as a baseline every test mutates
// from — keeps each test focused on the one field/rule it's actually
// exercising instead of re-declaring the whole shape every time.
function validForm() {
  return {
    ...createDefaultWizardForm(),
    leadId: 'lead-1',
    name: 'Test Project',
    therapy: 'cardiology' as const,
    type: ['screening_camp' as const],
    mode: 'po' as const,
    poNumber: 'PO-123',
    poDate: '2026-01-01',
    valueBeforeGST: 10000,
    gst: 18,
    campTimeSlots: ['9am-1pm' as const],
    whoCanBookCamp: ['pharma-asm' as const],
    goLiveScopeCode: 'pan' as const,
    salesRep: 'role-1',
    projectCoordinator: 'role-2',
    marketingContact: 'contact-1',
  }
}

describe('createProjectWizardSchema', () => {
  it('accepts a fully valid create-mode form', () => {
    const result = createProjectWizardSchema.safeParse(validForm())
    expect(result.success).toBe(true)
  })

  it('requires leadId (Step 0)', () => {
    const result = createProjectWizardSchema.safeParse({ ...validForm(), leadId: '' })
    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error.issues.map((i) => i.path[0])).toContain('leadId')
  })

  it('requires name, therapy, and at least one type (Step 1)', () => {
    const result = createProjectWizardSchema.safeParse({ ...validForm(), name: '', therapy: '', type: [] })
    expect(result.success).toBe(false)
    const paths = result.success ? [] : result.error.issues.map((i) => i.path[0])
    expect(paths).toEqual(expect.arrayContaining(['name', 'therapy', 'type']))
  })

  it('requires poNumber only when mode is po', () => {
    const missingPo = createProjectWizardSchema.safeParse({ ...validForm(), mode: 'po', poNumber: '' })
    expect(missingPo.success).toBe(false)

    const agreementModeWithoutPoNumber = createProjectWizardSchema.safeParse({
      ...validForm(),
      mode: 'agreement',
      poNumber: '',
      agreementStartDate: '2026-01-01',
    })
    expect(agreementModeWithoutPoNumber.success).toBe(true)
  })

  it('requires poDate only when mode is po', () => {
    const missingPoDate = createProjectWizardSchema.safeParse({ ...validForm(), mode: 'po', poDate: '' })
    expect(missingPoDate.success).toBe(false)
    expect(missingPoDate.success ? [] : missingPoDate.error.issues.map((i) => i.path[0])).toContain('poDate')

    const agreementModeWithoutPoDate = createProjectWizardSchema.safeParse({
      ...validForm(),
      mode: 'agreement',
      poDate: '',
      agreementStartDate: '2026-01-01',
    })
    expect(agreementModeWithoutPoDate.success).toBe(true)
  })

  it('requires agreementStartDate only when mode is agreement', () => {
    const result = createProjectWizardSchema.safeParse({
      ...validForm(),
      mode: 'agreement',
      agreementStartDate: '',
    })
    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error.issues.map((i) => i.path[0])).toContain('agreementStartDate')
  })

  it('requires emailReference only when mode is mail_confirmation', () => {
    const result = createProjectWizardSchema.safeParse({
      ...validForm(),
      mode: 'mail_confirmation',
      emailReference: '',
    })
    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error.issues.map((i) => i.path[0])).toContain('emailReference')
  })

  it('requires valueBeforeGST > 0 — behavior-preserving, a cleared/zero value is still rejected', () => {
    const result = createProjectWizardSchema.safeParse({ ...validForm(), valueBeforeGST: 0 })
    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error.issues.map((i) => i.path[0])).toContain('valueBeforeGST')
  })

  it('accepts campCost/totalCamps/additionalCost at 0 — behavior-preserving, blank normalizes to 0 and stays valid', () => {
    const result = createProjectWizardSchema.safeParse({ ...validForm(), campCost: 0, totalCamps: 0, additionalCost: 0 })
    expect(result.success).toBe(true)
  })

  it('rejects a negative campCost/totalCamps/additionalCost — mirrors the backend already-live nonnegative rule', () => {
    for (const field of ['campCost', 'totalCamps', 'additionalCost'] as const) {
      const result = createProjectWizardSchema.safeParse({ ...validForm(), [field]: -1 })
      expect(result.success, `${field} should reject a negative value`).toBe(false)
    }
  })

  it('rejects a fractional totalCamps — mirrors the backend\'s z.number().int() rule, so a submit-time 400 is caught client-side first', () => {
    const result = createProjectWizardSchema.safeParse({ ...validForm(), totalCamps: 1.5 })
    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error.issues.map((i) => i.path[0])).toContain('totalCamps')
  })

  it('accepts gst/daysToBookBefore/duration/etc. at 0 — behavior-preserving, these already tolerate 0 today', () => {
    const result = createProjectWizardSchema.safeParse({
      ...validForm(),
      gst: 0,
      freeCancelHours: 0,
      cancellationAllowed: 0,
      campCostDeductionOnChargableCancel: 0,
      daysToBookBefore: 0,
      poRenewalReminder: 0,
      duration: 0,
    })
    expect(result.success).toBe(true)
  })

  it('requires at least one state/city unless go-live scope is pan-India', () => {
    const statesNoValues = createProjectWizardSchema.safeParse({ ...validForm(), goLiveScopeCode: 'states', goLiveScopeValues: [] })
    expect(statesNoValues.success).toBe(false)

    const panNoValues = createProjectWizardSchema.safeParse({ ...validForm(), goLiveScopeCode: 'pan', goLiveScopeValues: [] })
    expect(panNoValues.success).toBe(true)
  })

  it('requires at least one camp time slot and one booking role', () => {
    const noSlots = createProjectWizardSchema.safeParse({ ...validForm(), campTimeSlots: [] })
    expect(noSlots.success).toBe(false)

    const noBookingRoles = createProjectWizardSchema.safeParse({ ...validForm(), whoCanBookCamp: [] })
    expect(noBookingRoles.success).toBe(false)
  })
})

describe('editProjectWizardSchema', () => {
  it('does NOT require leadId — a pre-existing project can have a null/stale lead reference (ProjectEntity.lead allows it), and edit mode never shows Step 0 to fix it', () => {
    const result = editProjectWizardSchema.safeParse({ ...validForm(), leadId: '' })
    expect(result.success).toBe(true)
  })

  it('still enforces every other rule shared with create mode (e.g. name is required)', () => {
    const result = editProjectWizardSchema.safeParse({ ...validForm(), leadId: '', name: '' })
    expect(result.success).toBe(false)
    expect(result.success ? [] : result.error.issues.map((i) => i.path[0])).toContain('name')
    expect(result.success ? [] : result.error.issues.map((i) => i.path[0])).not.toContain('leadId')
  })
})

describe('CREATE_STEP_FIELD_NAMES', () => {
  it('has exactly 7 entries — one per create-mode step', () => {
    expect(CREATE_STEP_FIELD_NAMES).toHaveLength(7)
  })

  it('step 0 covers only leadId — edit mode drops this step via .slice(1)', () => {
    expect(CREATE_STEP_FIELD_NAMES[0]).toEqual(['leadId'])
  })
})
