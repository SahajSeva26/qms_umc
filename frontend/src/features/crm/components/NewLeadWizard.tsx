import { useState } from 'react'
import type { Lead } from '@/types/lead.types'
import { DEFAULT_WIZARD_FORM, computeWizardScore, type WizardFormState } from '@/features/crm/wizard.types'
import { OWNERS } from '@/features/crm/crm.mock'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  wizardStep1Schema,
  wizardStep2Schema,
  wizardStep3Schema,
  wizardStep4Schema,
} from '@/features/crm/schemas/lead.schemas'
import WizardStep1 from '@/features/crm/components/wizard/WizardStep1'
import WizardStep2 from '@/features/crm/components/wizard/WizardStep2'
import WizardStep3 from '@/features/crm/components/wizard/WizardStep3'
import WizardStep4 from '@/features/crm/components/wizard/WizardStep4'

const STEP_LABELS = ['Pharma', 'Opportunity', 'QMS offer', 'Review']

const STEP_SCHEMAS = [wizardStep1Schema, wizardStep2Schema, wizardStep3Schema, wizardStep4Schema]

function validateStep(step: number, form: WizardFormState): string | null {
  const schema = STEP_SCHEMAS[step]
  if (!schema) return null
  const result = schema.safeParse(form)
  if (result.success) return null
  return result.error.issues[0]?.message ?? 'Please complete the required fields.'
}

function genLeadId(existing: Lead[]): string {
  const maxId = existing.reduce((max, l) => {
    const num = parseInt(l.id.replace('L-', ''), 10)
    return Number.isNaN(num) ? max : Math.max(max, num)
  }, 2400)
  return `L-${maxId + 1}`
}

interface NewLeadWizardProps {
  existingLeads: Lead[]
  onClose: () => void
  onCreate: (lead: Lead) => void
}

const NewLeadWizard = ({ existingLeads, onClose, onCreate }: NewLeadWizardProps) => {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<WizardFormState>(DEFAULT_WIZARD_FORM)
  const [error, setError] = useState<string | null>(null)

  const setField = <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleNext = () => {
    const err = validateStep(step, form)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    if (step < 3) setStep(step + 1)
  }

  const handleSave = () => {
    const err = validateStep(3, form)
    if (err) {
      setError(err)
      return
    }

    const owner = OWNERS.find((o) => o.name === form.owner) ?? OWNERS[0]
    const score = computeWizardScore(form)
    const id = genLeadId(existingLeads)

    const lead: Lead = {
      id,
      account: form.pharmaCompanyName,
      contact: form.contact,
      contactRole: form.contactRole,
      email: form.email,
      phone: form.phone,
      division: form.divisionName,
      therapy: form.focusTherapies[0] ?? '',
      brand: form.brandNames[0] ?? '',
      targetDoctors: form.focusDoctors.length * 20,
      existingActivity: form.currentActivities[0] ?? '',
      currentVendor: '— None —',
      problem: form.problemStatement,
      geography: '—',
      city: '—',
      state: '—',
      competitor: '— None —',
      value: form.estimatedValue,
      stage: 'new',
      score,
      owner: owner.name,
      ownerInitials: owner.initials,
      ownerTone: owner.tone,
      ownerRole: owner.role,
      age: 0,
      nextAction: 'Follow up',
      nextDue: form.nextFollowUpDate,
      source: 'Manual entry',
      created: new Date().toISOString().slice(0, 10),
      updated: new Date().toISOString().slice(0, 10),
      tags: [form.focusTherapies[0], form.projectType, form.divisionName].filter(Boolean) as string[],
      subject: form.subject,
      problemStatement: form.problemStatement,
      pharmaCompanyName: form.pharmaCompanyName,
      divisionName: form.divisionName,
      focusTherapies: form.focusTherapies,
      focusDoctors: form.focusDoctors,
      focusDoctorOther: form.focusDoctorOther,
      brandNames: form.brandNames,
      mrCount: form.mrCount,
      currentActivities: form.currentActivities,
      currentActivityOther: form.currentActivityOther,
      currentActivityNotes: form.currentActivityNotes,
      projectType: form.projectType,
      qmsOffers: form.qmsOffers,
      qmsOfferDetails: form.qmsOfferDetails,
      estimatedValue: form.estimatedValue,
      confidencePct: form.confidencePct,
      nextFollowUpDate: form.nextFollowUpDate,
    }

    onCreate(lead)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0"
        showCloseButton={false}
      >
        <div className="px-5 pt-5">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>New Lead</DialogTitle>
          </DialogHeader>
          <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: 'var(--qms-surface-strong)' }}>
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-lg transition-all"
                style={
                  i === step
                    ? { background: 'var(--qms-brand)', color: '#fff' }
                    : i < step
                    ? { color: 'var(--success)' }
                    : { color: 'var(--qms-text-muted)' }
                }
              >
                {i < step ? '✓ ' : `${i + 1}. `}{label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {step === 0 && <WizardStep1 form={form} setField={setField} />}
          {step === 1 && <WizardStep2 form={form} setField={setField} />}
          {step === 2 && <WizardStep3 form={form} setField={setField} />}
          {step === 3 && <WizardStep4 form={form} setField={setField} />}
        </div>

        <div className="px-5 pb-5 pt-3">
          {error && <p className="text-[12px] mb-2 text-danger">{error}</p>}
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>
            )}
            <div className="flex-1" />
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            {step < 3 ? (
              <Button
                onClick={handleNext}
                className="font-bold text-white"
                style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                className="font-bold text-white"
                style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
              >
                Save lead
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NewLeadWizard
