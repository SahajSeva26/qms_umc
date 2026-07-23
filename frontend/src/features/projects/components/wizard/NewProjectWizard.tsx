import { Fragment, useState } from 'react'
import { FiFolder, FiArrowLeft, FiArrowRight, FiSave, FiX } from 'react-icons/fi'
import type { CreateProjectPayload, ExecutionMode, ProjectEntity, ProjectTherapy, UpdateProjectPayload } from '@/types/project.types'
import { DEFAULT_WIZARD_FORM, type WizardFormState } from '@/features/projects/wizard.types'
import { useCreateProject } from '@/features/projects/hooks/useCreateProject'
import { useUpdateProject } from '@/features/projects/hooks/useUpdateProject'
import { toast } from '@/components/ui/sonner'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  wizardStep0Schema,
  wizardStep1Schema,
  wizardStep2Schema,
  wizardStep3Schema,
  wizardStep4Schema,
  wizardStep5Schema,
  wizardStep6Schema,
} from '@/features/projects/schemas/project.schemas'
import WizardStep0 from '@/features/projects/components/wizard/WizardStep0'
import WizardStep1 from '@/features/projects/components/wizard/WizardStep1'
import WizardStep2 from '@/features/projects/components/wizard/WizardStep2'
import WizardStep3 from '@/features/projects/components/wizard/WizardStep3'
import WizardStep4 from '@/features/projects/components/wizard/WizardStep4'
import WizardStep5 from '@/features/projects/components/wizard/WizardStep5'
import WizardStep6 from '@/features/projects/components/wizard/WizardStep6'

// Step 0 (pick a won lead) is new — doesn't exist on the old mock wizard.
// Edit mode skips it entirely: lead/tenant/division are immutable post-create
// (UpdateProjectPayload has no lead field), so an edit session starts at
// step 1 with the project's existing lead-derived context shown read-only.
const CREATE_STEPS = [
  { label: 'Lead', heading: 'Pick the source lead', sub: 'A project is created from a won lead — tenant and division are derived from it automatically.' },
  { label: 'Basics', heading: 'Project basics', sub: 'Identity, therapy, project type(s), and tests conducted.' },
  { label: 'Execution', heading: 'Execution mode', sub: 'How will the project be commercially anchored?' },
  { label: 'Financials', heading: 'Financials', sub: 'Per-camp cost × total camps → pre-GST → GST → total. Edit values; GST recalculates live.' },
  { label: 'Operations', heading: 'Operations', sub: 'Camp timings, cancellation rules, go-live scope, and who can book camps.' },
  { label: 'Team & Pay', heading: 'Team & payment terms', sub: 'Project team + commercial terms.' },
  { label: 'Reports & Review', heading: 'Booking gate, reports & review', sub: 'Set the pharma booking lead-time and client reporting cadence — then save.' },
]
const EDIT_STEPS = CREATE_STEPS.slice(1)

const CREATE_STEP_SCHEMAS = [wizardStep0Schema, wizardStep1Schema, wizardStep2Schema, wizardStep3Schema, wizardStep4Schema, wizardStep5Schema, wizardStep6Schema]
const EDIT_STEP_SCHEMAS = CREATE_STEP_SCHEMAS.slice(1)

function validateStep(schemas: typeof CREATE_STEP_SCHEMAS, step: number, form: WizardFormState): string | null {
  const schema = schemas[step]
  if (!schema) return null
  const result = schema.safeParse(form)
  if (result.success) return null
  return result.error.issues[0]?.message ?? 'Please complete the required fields.'
}

function projectToForm(p: ProjectEntity): WizardFormState {
  const leadId = typeof p.lead === 'string' ? p.lead : p.lead._id ?? ''
  const leadTitle = typeof p.lead === 'string' ? '' : p.lead.title
  const tenantId = typeof p.tenant === 'string' ? p.tenant : p.tenant._id ?? ''
  const tenantName = typeof p.tenant === 'string' ? '' : p.tenant.name
  const divisionName = typeof p.division === 'string' ? '' : p.division.name
  const salesRep = typeof p.salesRep === 'string' ? p.salesRep : p.salesRep._id ?? ''
  const projectCoordinator = typeof p.projectCoordinator === 'string' ? p.projectCoordinator : p.projectCoordinator._id ?? ''
  const marketingContact = typeof p.marketingContact === 'string' ? p.marketingContact : p.marketingContact._id ?? ''

  return {
    leadId,
    leadTitle,
    leadTenantId: tenantId,
    leadTenantName: tenantName,
    leadDivisionName: divisionName,

    name: p.name,
    therapy: p.therapy,
    type: p.type,
    tests: p.tests,

    mode: p.mode?.mode ?? 'po',
    poNumber: p.mode?.poNumber ?? '',
    poDate: p.mode?.poDate ?? new Date().toISOString().slice(0, 10),
    poExpiry: p.mode?.poExpiry ?? '',
    agreementNumber: p.mode?.agreementNumber ?? '',
    agreementStartDate: p.mode?.agreementStartDate ?? '',
    agreementEndDate: p.mode?.agreementEndDate ?? '',
    duration: p.mode?.duration ?? 12,
    agreementDocument: p.mode?.agreementDocument ?? '',
    emailReference: p.mode?.emailReference ?? '',
    emailDocument: p.mode?.emailDocument ?? '',

    campCost: p.campCost,
    totalCamps: p.totalCamps,
    valueBeforeGST: p.valueBeforeGST,
    valueBeforeGSTTouched: true,
    gst: p.gst,
    additionalCost: p.additionalCost,

    campTimeSlots: p.campTimeSlots,
    freeCancelHours: p.freeCancelHours,
    cancellationAllowed: p.cancellationAllowed,
    campCostDeductionOnChargableCancel: p.campCostDeductionOnChargableCancel,
    goLiveScopeCode: p.goLiveScope?.code ?? 'states',
    goLiveScopeValues: p.goLiveScope?.values ?? [],
    whoCanBookCamp: p.whoCanBookCamp,

    salesRep,
    projectCoordinator,
    marketingContact,
    paymentTerms: p.paymentTerms,

    daysToBookBefore: p.daysToBookBefore,
    dietChart: p.dietChart,
    poRenewalReminder: p.poRenewalReminder,
    clientReportCandance: p.clientReportCandance ?? 'monthly',
    availablePointers: p.availablePointers,
    tats: p.tats,
    sops: p.sops,
  }
}

interface NewProjectWizardProps {
  editProject: ProjectEntity | null
  onClose: () => void
  onSaved: (id: string) => void
}

const NewProjectWizard = ({ editProject, onClose, onSaved }: NewProjectWizardProps) => {
  const isEdit = !!editProject
  const STEPS = isEdit ? EDIT_STEPS : CREATE_STEPS
  const STEP_SCHEMAS = isEdit ? EDIT_STEP_SCHEMAS : CREATE_STEP_SCHEMAS

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<WizardFormState>(editProject ? projectToForm(editProject) : DEFAULT_WIZARD_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const createProject = useCreateProject()
  const updateProject = useUpdateProject()

  const setField = <K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const lastStep = STEPS.length - 1

  const handleNext = () => {
    const err = validateStep(STEP_SCHEMAS, step, form)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    if (step < lastStep) setStep(step + 1)
  }

  const handleSave = async () => {
    const err = validateStep(STEP_SCHEMAS, lastStep, form)
    if (err) {
      setError(err)
      return
    }
    setError(null)

    const mode: ExecutionMode = {
      mode: form.mode,
      ...(form.mode === 'po' ? { poNumber: form.poNumber, poDate: form.poDate, poExpiry: form.poExpiry || undefined } : {}),
      ...(form.mode === 'agreement'
        ? { agreementNumber: form.agreementNumber || undefined, agreementStartDate: form.agreementStartDate, agreementEndDate: form.agreementEndDate || undefined, duration: form.duration || undefined, agreementDocument: form.agreementDocument || undefined }
        : {}),
      ...(form.mode === 'mail_confirmation' ? { emailReference: form.emailReference, emailDocument: form.emailDocument || undefined } : {}),
    }

    // Every field common to both Create and Update — required on Create,
    // optional on Update (per UpdateProjectPayload's own doc comment: lead/
    // tenant/division/status are the only fields absent entirely).
    const commonFields = {
      name: form.name,
      therapy: form.therapy as ProjectTherapy,
      type: form.type,
      tests: form.tests,
      mode,
      campCost: form.campCost,
      totalCamps: form.totalCamps,
      gst: form.gst,
      valueBeforeGST: form.valueBeforeGST,
      additionalCost: form.additionalCost,
      campTimeSlots: form.campTimeSlots,
      freeCancelHours: form.freeCancelHours,
      cancellationAllowed: form.cancellationAllowed,
      campCostDeductionOnChargableCancel: form.campCostDeductionOnChargableCancel,
      goLiveScope: { code: form.goLiveScopeCode, values: form.goLiveScopeValues },
      whoCanBookCamp: form.whoCanBookCamp,
      salesRep: form.salesRep,
      projectCoordinator: form.projectCoordinator,
      marketingContact: form.marketingContact,
      paymentTerms: form.paymentTerms,
      daysToBookBefore: form.daysToBookBefore,
      dietChart: form.dietChart,
      poRenewalReminder: form.poRenewalReminder,
      clientReportCandance: form.clientReportCandance,
      availablePointers: form.availablePointers,
      tats: form.tats,
      sops: form.sops,
    }

    setIsSaving(true)
    try {
      if (isEdit && editProject) {
        const updatePayload: UpdateProjectPayload = commonFields
        await updateProject.mutateAsync({ id: editProject.id, payload: updatePayload })
        onSaved(editProject.id)
      } else {
        const createPayload: CreateProjectPayload = { lead: form.leadId, ...commonFields }
        const res = await createProject.mutateAsync(createPayload)
        toast.success('Project created')
        if (res.data) onSaved(res.data.id)
      }
      onClose()
    } catch {
      // no-op: useCreateProject/useUpdateProject have no onError toast of
      // their own yet — surface a generic one here so failures aren't silent.
      toast.error(isEdit ? 'Could not save changes — try again.' : 'Could not create the project — try again.')
    } finally {
      setIsSaving(false)
    }
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
              {isEdit ? `Edit project · ${editProject.name}` : 'New project'}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
              {STEPS.map((s) => s.label).join(' → ')}
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

          {!isEdit && step === 0 && <WizardStep0 form={form} setField={setField} />}
          {step === (isEdit ? 0 : 1) && <WizardStep1 form={form} setField={setField} />}
          {step === (isEdit ? 1 : 2) && <WizardStep2 form={form} setField={setField} />}
          {step === (isEdit ? 2 : 3) && <WizardStep3 form={form} setField={setField} />}
          {step === (isEdit ? 3 : 4) && <WizardStep4 form={form} setField={setField} />}
          {step === (isEdit ? 4 : 5) && <WizardStep5 form={form} setField={setField} />}
          {step === (isEdit ? 5 : 6) && <WizardStep6 form={form} setField={setField} />}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-3" style={{ borderTop: '1px solid var(--qms-border)' }}>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            {form.name || '(no name)'}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {error && <p className="text-[12px] text-danger">{error}</p>}
            <div className="flex gap-2">
              {step > 0
                ? <Button variant="ghost" onClick={() => setStep(step - 1)} style={{ border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}><FiArrowLeft size={14} /> Back</Button>
                : <Button variant="ghost" onClick={onClose} style={{ border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}>Cancel</Button>}
              {step < lastStep ? (
                <Button onClick={handleNext} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), #3b6dff 60%, var(--qms-teal))' }}>
                  Next <FiArrowRight size={14} />
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={isSaving} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), #3b6dff 60%, var(--qms-teal))' }}>
                  <FiSave size={14} /> {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create project'}
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
