import { Fragment, useState } from 'react'
import { FiFolder, FiArrowLeft, FiArrowRight, FiSave, FiX } from 'react-icons/fi'
import type { Project } from '@/types/project.types'
import { DEFAULT_WIZARD_FORM, type WizardFormState } from '@/features/projects/wizard.types'
import { genProjectId } from '@/features/projects/projects.utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  wizardStep1Schema,
  wizardStep2Schema,
  wizardStep3Schema,
  wizardStep4Schema,
  wizardStep5Schema,
  wizardStep6Schema,
} from '@/features/projects/schemas/project.schemas'
import WizardStep1 from '@/features/projects/components/wizard/WizardStep1'
import WizardStep2 from '@/features/projects/components/wizard/WizardStep2'
import WizardStep3 from '@/features/projects/components/wizard/WizardStep3'
import WizardStep4 from '@/features/projects/components/wizard/WizardStep4'
import WizardStep5 from '@/features/projects/components/wizard/WizardStep5'
import WizardStep6 from '@/features/projects/components/wizard/WizardStep6'

// Matches the prototype's exact per-step pane-h / pane-sub copy (projects-manager.js).
const STEPS = [
  { label: 'Basics', heading: 'Project basics', sub: 'Identity, client, scope. Tests are pulled from Admin → Master → Tests. Status is set on the last step.' },
  { label: 'Execution', heading: 'Execution mode', sub: 'How will the project be commercially anchored?' },
  { label: 'Financials', heading: 'Financials', sub: 'Per-camp cost × total camps → pre-GST → GST → total. Edit values; GST recalculates live.' },
  { label: 'Operations', heading: 'Operations', sub: 'Camp timings, cancellation rules, go-live scope, and who can book camps.' },
  { label: 'Team & Pay', heading: 'Team & payment terms', sub: 'Project team + commercial terms. Live invoice / Tally / GRN / payment tracking lives in CRM Invoicing & CFO Accounting.' },
  { label: 'Reports & Review', heading: 'Status, booking gate, reports & review', sub: 'Set the go-live status, the pharma booking lead-time, and the client reporting cadence — then save.' },
]

const STEP_SCHEMAS = [wizardStep1Schema, wizardStep2Schema, wizardStep3Schema, wizardStep4Schema, wizardStep5Schema, wizardStep6Schema]

function validateStep(step: number, form: WizardFormState): string | null {
  const schema = STEP_SCHEMAS[step]
  if (!schema) return null
  const result = schema.safeParse(form)
  if (result.success) return null
  return result.error.issues[0]?.message ?? 'Please complete the required fields.'
}

function projectToForm(p: Project): WizardFormState {
  return {
    name: p.name,
    clientId: p.clientId,
    divisionId: p.divisionId ?? '',
    therapy: p.therapy,
    type: p.type,
    mixedSubTypes: p.mixedSubTypes,
    testsConducted: p.testsConducted,
    executionMode: p.executionMode,
    poNo: p.poNo,
    poDate: p.poDate,
    poExpiry: p.poExpiry,
    agreementNo: p.agreementNo,
    agreementStart: p.agreementStart,
    agreementExpiry: p.agreementExpiry,
    agreementDurationMonths: p.agreementDurationMonths,
    agreementDoc: p.agreementDoc,
    mailRef: p.mailRef,
    mailAttachmentDoc: p.mailAttachmentDoc,
    campCost: p.campCost,
    totalCamps: p.totalCamps,
    valueBeforeGst: p.valueBeforeGst,
    valueBeforeGstTouched: true,
    gstPct: p.gstPct,
    additionalPatientCost: p.additionalPatientCost,
    campTimeSlots: p.campTimeSlots,
    cancellationPolicy: p.cancellationPolicy,
    goLiveScope: p.goLiveScope,
    goLiveDetails: p.goLiveDetails,
    bookingHierarchy: p.bookingHierarchy,
    salesPersonId: p.salesPersonId,
    coordinatorId: p.coordinatorId,
    marketingContactId: p.marketingContactId,
    paymentTerms: p.paymentTerms,
    status: p.status,
    bookingLeadDays: p.bookingLeadDays,
    dietCharts: p.dietCharts,
    renewalReminderPct: p.renewalReminderPct,
    reportCadence: p.reportCadence,
    reportFormat: p.reportFormat,
    tats: p.tats,
    sops: p.sops,
  }
}

interface NewProjectWizardProps {
  existingProjects: Project[]
  editProject: Project | null
  onClose: () => void
  onCreate: (project: Project) => void
  onUpdate: (project: Project) => void
}

const NewProjectWizard = ({ existingProjects, editProject, onClose, onCreate, onUpdate }: NewProjectWizardProps) => {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<WizardFormState>(editProject ? projectToForm(editProject) : DEFAULT_WIZARD_FORM)
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
    if (step < 5) setStep(step + 1)
  }

  const handleSave = () => {
    const err = validateStep(5, form)
    if (err) {
      setError(err)
      return
    }

    const gstAmount = Math.round(form.valueBeforeGst * (form.gstPct / 100))
    const valueAfterGst = form.valueBeforeGst + gstAmount
    const id = editProject?.id ?? genProjectId(existingProjects)
    const now = new Date().toISOString()

    // Always seed pos[0] from the wizard's PO fields at save time — the
    // prototype's own bug (new PO-mode projects show "0 POs" until the next
    // reload/backfill) is deliberately NOT replicated here.
    const pos =
      form.executionMode === 'PO' && form.poNo
        ? [{ id: editProject?.pos[0]?.id ?? `po-${id}`, poNo: form.poNo, poDate: form.poDate, poExpiry: form.poExpiry, campCount: form.totalCamps, value: valueAfterGst, status: 'ACTIVE' as const }]
        : editProject?.pos ?? []

    const project: Project = {
      id,
      name: form.name,
      clientId: form.clientId,
      divisionId: form.divisionId || null,
      type: form.type || 'Screening',
      mixedSubTypes: form.mixedSubTypes,
      therapy: form.therapy,
      testsConducted: form.testsConducted,
      bookingLeadDays: form.bookingLeadDays,
      status: form.status,
      executionMode: form.executionMode,
      poNo: form.poNo,
      poDate: form.poDate,
      poExpiry: form.poExpiry,
      agreementNo: form.agreementNo,
      agreementStart: form.agreementStart,
      agreementExpiry: form.agreementExpiry,
      agreementDurationMonths: form.agreementDurationMonths,
      agreementDoc: form.agreementDoc,
      mailRef: form.mailRef,
      mailAttachmentDoc: form.mailAttachmentDoc,
      campCost: form.campCost,
      totalCamps: form.totalCamps,
      campsDone: editProject?.campsDone ?? 0,
      valueBeforeGst: form.valueBeforeGst,
      gstPct: form.gstPct,
      gstAmount,
      valueAfterGst,
      additionalPatientCost: form.additionalPatientCost,
      campTimeSlots: form.campTimeSlots,
      cancellationPolicy: form.cancellationPolicy,
      goLiveScope: form.goLiveScope,
      goLiveDetails: form.goLiveDetails,
      bookingHierarchy: form.bookingHierarchy,
      salesPersonId: form.salesPersonId,
      coordinatorId: form.coordinatorId,
      marketingContactId: form.marketingContactId,
      paymentTerms: form.paymentTerms,
      renewalReminderPct: form.renewalReminderPct,
      reportCadence: form.reportCadence,
      reportFormat: form.reportFormat,
      tats: form.tats,
      sops: form.sops,
      dietCharts: form.dietCharts,
      voidCamps: editProject?.voidCamps ?? [],
      closeReason: editProject?.closeReason ?? '',
      healthScore: editProject?.healthScore ?? 80,
      startDate: editProject?.startDate ?? form.poDate ?? now.slice(0, 10),
      endDate: editProject?.endDate ?? form.poExpiry ?? '',
      createdAt: editProject?.createdAt ?? now,
      updatedAt: now,
      statusHistory: editProject?.statusHistory ?? [],
      pos,
    }

    if (editProject) onUpdate(project)
    else onCreate(project)
  }

  const currentStep = STEPS[step]

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0"
        style={{ width: 'min(900px, 96vw)', maxWidth: 'min(900px, 96vw)' }}
        showCloseButton={false}
      >
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--qms-border)' }}>
          <FiFolder size={18} style={{ color: 'var(--qms-brand)' }} />
          <div className="flex-1">
            <div className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
              {editProject ? `Edit project · ${editProject.name || editProject.id}` : 'New project'}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
              Basics → Execution → Financials → Operations → Team & Payment → Reports
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
          <div className="text-[15px] font-extrabold mt-1 mb-0.5" style={{ color: 'var(--qms-text)' }}>{currentStep.heading}</div>
          <p className="text-[11px] mb-3.5" style={{ color: 'var(--qms-text-muted)' }}>{currentStep.sub}</p>

          {step === 0 && <WizardStep1 form={form} setField={setField} />}
          {step === 1 && <WizardStep2 form={form} setField={setField} />}
          {step === 2 && <WizardStep3 form={form} setField={setField} />}
          {step === 3 && <WizardStep4 form={form} setField={setField} />}
          {step === 4 && <WizardStep5 form={form} setField={setField} />}
          {step === 5 && <WizardStep6 form={form} setField={setField} />}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-3" style={{ borderTop: '1px solid var(--qms-border)' }}>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            {editProject?.id ?? 'PRJ-·new'} · {form.name || '(no name)'}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {error && <p className="text-[12px] text-danger">{error}</p>}
            <div className="flex gap-2">
              {step > 0
                ? <Button variant="ghost" onClick={() => setStep(step - 1)} style={{ border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}><FiArrowLeft size={14} /> Back</Button>
                : <Button variant="ghost" onClick={onClose} style={{ border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}>Cancel</Button>}
              {step < 5 ? (
                <Button onClick={handleNext} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), #3b6dff 60%, var(--qms-teal))' }}>
                  Next <FiArrowRight size={14} />
                </Button>
              ) : (
                <Button onClick={handleSave} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), #3b6dff 60%, var(--qms-teal))' }}>
                  <FiSave size={14} /> {editProject ? 'Save changes' : 'Create project'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NewProjectWizard
