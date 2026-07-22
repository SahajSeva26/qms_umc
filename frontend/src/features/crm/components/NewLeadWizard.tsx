import { Fragment, useState } from 'react'
import { FiBriefcase, FiArrowLeft, FiArrowRight, FiSave, FiX } from 'react-icons/fi'
import type { CreateLeadPayload } from '@/types/crm.types'
import { DEFAULT_WIZARD_FORM, computeWizardScore, type WizardFormState } from '@/features/crm/wizard.types'
import { useLeads } from '@/features/crm/hooks/useLeads'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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

// Matches the prototype's exact per-step pane-h / pane-sub copy (crm-sales-leads.js).
// Note: the modal breadcrumb literally says "Commercial" for step 3 even
// though the step pill itself says "QMS offer" — a real prototype quirk,
// replicated exactly rather than "fixed."
const STEPS = [
  { label: 'Pharma', heading: 'Pharma context', sub: '' },
  { label: 'Opportunity', heading: 'Opportunity & current activity', sub: "Describe the client's problem, their MR strength, and what they run today." },
  { label: 'QMS offer', heading: 'What QMS can offer', sub: 'Pick the project type, then the offerings — add a sub-offering and the reason for each.' },
  { label: 'Review', heading: 'Commercial, timing & review', sub: '' },
]

const STEP_SCHEMAS = [wizardStep1Schema, wizardStep2Schema, wizardStep3Schema, wizardStep4Schema]

function validateStep(step: number, form: WizardFormState): string | null {
  const schema = STEP_SCHEMAS[step]
  if (!schema) return null
  const result = schema.safeParse(form)
  if (result.success) return null
  return result.error.issues[0]?.message ?? 'Please complete the required fields.'
}

interface NewLeadWizardProps {
  onClose: () => void
  onCreated: () => void
}

const NewLeadWizard = ({ onClose, onCreated }: NewLeadWizardProps) => {
  const { createLead, isCreating } = useLeads()
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

  const handleSave = async () => {
    const err = validateStep(3, form)
    if (err) {
      setError(err)
      return
    }

    const payload: CreateLeadPayload = {
      tenant: form.tenantId,
      division: form.divisionId,
      contactPerson: form.contactPersonId,
      salesPerson: form.salesPersonId,
      title: form.title,
      problemStatement: form.problemStatement,
      numberOfMRS: form.numberOfMRS,
      projectType: form.projectType || undefined,
      focusTherapy: form.focusTherapy,
      focusTherapyDoctor: form.focusTherapyDoctor,
      currentlyDoing: form.currentlyDoing,
      offers: form.offers,
      estimatedValue: form.estimatedValue,
      confidence: form.confidence,
      followUpDate: form.followUpDate,
    }

    // Await so the modal only closes on real success — useLeads' own
    // onError toast still fires on failure, and the modal stays open with
    // its filled-in form intact so the user can retry rather than losing
    // their input to a silently-closed dialog.
    try {
      await createLead(payload)
      onCreated()
    } catch {
      // no-op: useLeads' createLeadMutation.onError already toasted
    }
  }

  const currentStep = STEPS[step]
  const score = computeWizardScore(form)

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0"
        style={{ width: 'min(720px, 92vw)', maxWidth: 'min(720px, 92vw)' }}
        showCloseButton={false}
      >
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--qms-border)' }}>
          <FiBriefcase size={18} style={{ color: 'var(--qms-brand)' }} />
          <div className="flex-1">
            <div className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>New Lead</div>
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
              Pharma → Opportunity → Commercial → Review
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded-[10px] border p-1.5"
            style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
          >
            <FiX size={16} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            {STEPS.map((s, i) => (
              <Fragment key={s.label}>
                {i > 0 && <span className="w-2.5 h-px shrink-0" style={{ background: 'var(--qms-border)' }} />}
                <div
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-[11px] font-bold whitespace-nowrap"
                  style={
                    i === step
                      ? { borderColor: 'var(--qms-brand)', color: 'var(--qms-brand)', background: 'color-mix(in oklab, var(--qms-brand) 8%, transparent)' }
                      : i < step
                      ? { borderColor: 'color-mix(in oklab, var(--success) 40%, transparent)', color: 'var(--success)', background: 'transparent' }
                      : { borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)', background: 'var(--qms-surface-strong)' }
                  }
                >
                  <span
                    className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full text-[11px] font-extrabold shrink-0"
                    style={
                      i === step
                        ? { background: 'var(--qms-brand)', color: '#fff' }
                        : i < step
                        ? { background: 'var(--success)', color: '#fff' }
                        : { background: 'rgba(0,0,0,.05)', color: 'var(--qms-text-muted)' }
                    }
                  >
                    {i + 1}
                  </span>
                  {s.label}
                </div>
              </Fragment>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {currentStep.heading && <div className="text-[15px] font-bold mt-1 mb-0.5" style={{ color: 'var(--qms-text)' }}>{currentStep.heading}</div>}
          {currentStep.sub && <p className="text-[12px] mb-3.5" style={{ color: 'var(--qms-text-muted)' }}>{currentStep.sub}</p>}

          {step === 0 && <WizardStep1 form={form} setField={setField} />}
          {step === 1 && <WizardStep2 form={form} setField={setField} />}
          {step === 2 && <WizardStep3 form={form} setField={setField} />}
          {step === 3 && <WizardStep4 form={form} setField={setField} />}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-3" style={{ borderTop: '1px solid var(--qms-border)' }}>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            New lead · {form.tenantLabel || '(no company)'} · score {score}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {error && <p className="text-[12px] text-danger">{error}</p>}
            <div className="flex gap-2">
              {step > 0
                ? <Button variant="ghost" onClick={() => setStep(step - 1)} style={{ border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}><FiArrowLeft size={14} /> Back</Button>
                : <Button variant="ghost" onClick={onClose} style={{ border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}>Cancel</Button>}
              {step < 3 ? (
                <Button onClick={handleNext} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), #3b6dff 60%, var(--qms-teal))' }}>
                  Next <FiArrowRight size={14} />
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={isCreating} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), #3b6dff 60%, var(--qms-teal))' }}>
                  <FiSave size={14} /> {isCreating ? 'Creating…' : 'Create lead'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NewLeadWizard
