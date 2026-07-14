import { useState } from 'react'
import type { Project } from '@/types/project.types'
import { DEFAULT_WIZARD_FORM, type WizardFormState } from '@/features/projects/wizard.types'
import { genProjectId } from '@/features/projects/projects.utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

const STEP_LABELS = ['Basics', 'Execution', 'Financials', 'Operations', 'Team & Pay', 'Reports & Review']

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

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0" showCloseButton={false}>
        <div className="px-5 pt-5">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
              {editProject ? `Edit project · ${editProject.id}` : 'New project'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-1 p-1 rounded-xl mb-4 flex-wrap" style={{ background: 'var(--qms-surface-strong)' }}>
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className="flex-1 min-w-20 text-center text-[11px] font-semibold py-1.5 rounded-lg transition-all"
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
          {step === 4 && <WizardStep5 form={form} setField={setField} />}
          {step === 5 && <WizardStep6 form={form} setField={setField} />}
        </div>

        <div className="px-5 pb-5 pt-3">
          {error && <p className="text-[12px] mb-2 text-danger">{error}</p>}
          <div className="flex gap-2">
            {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}
            <div className="flex-1" />
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            {step < 5 ? (
              <Button onClick={handleNext} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSave} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
                {editProject ? 'Save changes' : 'Create project'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NewProjectWizard
