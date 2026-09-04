import { Fragment, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiFolder, FiArrowLeft, FiArrowRight, FiSave, FiX } from 'react-icons/fi'
import type { CreateProjectPayload, ExecutionMode, ProjectEntity, ProjectTherapy, UpdateProjectPayload } from '@/types/project.types'
import { createDefaultWizardForm, type WizardFormState } from '@/features/projects/wizard.types'
import { formatIsoDateLocal } from '@/features/projects/projects.utils'
import { useCreateProject } from '@/features/projects/hooks/useCreateProject'
import { useUpdateProject } from '@/features/projects/hooks/useUpdateProject'
import { useProjectDraftStore } from '@/features/projects/projectDraft.store'
import { useDebouncedDraftSync } from '@/hooks/useDebouncedDraftSync'
import type { createDraftStore } from '@/hooks/useDraftStore'
import { toast } from '@/components/ui/sonner'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import DraftLoadingPlaceholder from '@/components/ui/DraftLoadingPlaceholder'
import DraftResumeDecision from '@/components/ui/DraftResumeDecision'
import { createProjectWizardSchema, editProjectWizardSchema, CREATE_STEP_FIELD_NAMES } from '@/features/projects/schemas/project.schemas'
import { WizardValidationProvider } from '@/features/projects/components/wizard/WizardValidationContext'
import WizardStep0 from '@/features/projects/components/wizard/WizardStep0'
import WizardStep1 from '@/features/projects/components/wizard/WizardStep1'
import WizardStep2 from '@/features/projects/components/wizard/WizardStep2'
import WizardStep3 from '@/features/projects/components/wizard/WizardStep3'
import WizardStep4 from '@/features/projects/components/wizard/WizardStep4'
import WizardStep5 from '@/features/projects/components/wizard/WizardStep5'
import WizardStep6 from '@/features/projects/components/wizard/WizardStep6'
import { unwrapId } from '@/utils/unwrapId'

// Edit mode skips Step 0 entirely: lead/tenant/division are immutable
// post-create, so an edit session starts at step 1.
const CREATE_STEPS = [
  { label: 'Lead', heading: 'Pick the source lead', sub: 'A project is created from a won lead — company and division are derived from it automatically.' },
  { label: 'Basics', heading: 'Project basics', sub: 'Identity, therapy, project type(s), and tests conducted.' },
  { label: 'Execution', heading: 'Execution mode', sub: 'How will the project be commercially anchored?' },
  { label: 'Financials', heading: 'Financials', sub: 'Per-camp cost × total camps → pre-GST → GST → total. Edit values; GST recalculates live.' },
  { label: 'Operations', heading: 'Operations', sub: 'Camp timings, cancellation rules, go-live scope, and who can book camps.' },
  { label: 'Team & Pay', heading: 'Team & payment terms', sub: 'Project team + commercial terms.' },
  { label: 'Reports & Review', heading: 'Booking gate, reports & review', sub: 'Set the pharma booking lead-time and client reporting cadence — then save.' },
]
const EDIT_STEPS = CREATE_STEPS.slice(1)

// Guards against null even though lead/tenant/salesRep/projectCoordinator/
// marketingContact are all `required: true` in project.model.ts — that only
// enforces new saves, not a populate() that resolved to null.
function projectToForm(p: ProjectEntity): WizardFormState {
  const leadId = unwrapId(p.lead)
  const leadTitle = !p.lead || typeof p.lead === 'string' ? '' : p.lead.title
  const tenantId = unwrapId(p.tenant)
  const tenantName = !p.tenant || typeof p.tenant === 'string' ? '' : p.tenant.name
  const divisionId = unwrapId(p.division)
  const divisionName = !p.division || typeof p.division === 'string' ? '' : p.division.name
  const salesRep = unwrapId(p.salesRep)
  const projectCoordinator = unwrapId(p.projectCoordinator)
  const marketingContact = unwrapId(p.marketingContact)

  return {
    leadId,
    leadTitle,
    leadTenantId: tenantId,
    leadTenantName: tenantName,
    leadDivisionId: divisionId,
    leadDivisionName: divisionName,

    name: p.name,
    therapy: p.therapy,
    type: p.type,
    tests: p.tests,

    mode: p.mode?.mode ?? 'po',
    poNumber: p.mode?.poNumber ?? '',
    poDate: p.mode?.poDate ?? formatIsoDateLocal(new Date()),
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

type DraftMode = 'disabled' | 'loading' | 'pending-decision' | 'active'

// Isolated under FormProvider so the whole-form useWatch()'s re-renders stay
// scoped to this tiny component instead of re-rendering the entire modal on
// every keystroke. Only ever mounted while draftMode === 'active' (see
// render site below) — isDirty still gates the actual write so a freshly-
// activated, untouched form doesn't persist a no-op draft immediately.
// `stop` is reported up via a state setter (not a ref) — onSubmit needs to
// call it, and reading a ref's .current inside a function passed to
// handleSubmit(...) (itself invoked during render) trips this codebase's
// react-hooks/refs rule; state read normally in onSubmit's closure does not.
function ProjectDraftSync({
  store,
  onStopChange,
}: {
  store: ReturnType<typeof createDraftStore<WizardFormState>>
  onStopChange: Dispatch<SetStateAction<(() => void) | null>>
}) {
  const { control, formState: { isDirty } } = useFormContext<WizardFormState>()
  const values = useWatch({ control })
  const stop = useDebouncedDraftSync(values as WizardFormState, isDirty, (v) => store.getState().setDraft(v))
  useEffect(() => {
    // Passed as a updater-style callback, NOT onStopChange(stop) directly —
    // useState's setter special-cases a function argument as "compute the
    // next state from the previous," so setStopSync(stop) would actually
    // CALL stop() immediately (stopping the sync on every render) and store
    // its `undefined` return value instead of the function itself.
    onStopChange(() => stop)
  }, [onStopChange, stop])
  return null
}

interface NewProjectWizardProps {
  editProject: ProjectEntity | null
  onClose: () => void
  onSaved: (id: string) => void
}

const NewProjectWizard = ({ editProject, onClose, onSaved }: NewProjectWizardProps) => {
  const isEdit = !!editProject
  const STEPS = isEdit ? EDIT_STEPS : CREATE_STEPS
  // Edit mode drops Step 0 ("Lead") — its step 0 is really CREATE step 1
  // ("Basics"). Indexing CREATE_STEP_FIELD_NAMES directly in edit mode would
  // wrongly validate leadId instead of Basics' own fields.
  const activeStepFieldNames = isEdit ? CREATE_STEP_FIELD_NAMES.slice(1) : CREATE_STEP_FIELD_NAMES

  const [step, setStep] = useState(0)
  const [attemptedFields, setAttemptedFields] = useState<Set<keyof WizardFormState>>(new Set())

  // Edit mode never enables draft persistence at all — no store lookup, no
  // reads, no writes, no clears, so an unfinished New Project draft can
  // never be disturbed by opening/saving an unrelated existing project.
  const { status: draftStatus, store: draftStore } = useProjectDraftStore({ enabled: !isEdit })
  const [draftMode, setDraftMode] = useState<DraftMode>('loading')
  const [stopSync, setStopSync] = useState<(() => void) | null>(null)

  // Derives draftMode from the store hook's own status the first time it
  // settles into 'disabled' or 'ready' — adjusting state directly during
  // render (React's documented pattern for deriving state once from a value
  // that becomes available), guarded by draftMode itself so it only ever
  // fires once per instance and can never regress an already-active session
  // (post-Resume/Discard) back to a decision view. React discards this
  // render and immediately re-renders with the new state, so no effect (and
  // no extra commit of the stale 'loading' render) is involved.
  if (draftMode === 'loading') {
    if (draftStatus === 'disabled') {
      setDraftMode('disabled')
    } else if (draftStatus === 'ready') {
      setDraftMode(draftStore.getState().draft ? 'pending-decision' : 'active')
    }
  }

  const form = useForm<WizardFormState>({
    // leadId is required only in create mode — a pre-existing project can
    // have a null/stale lead reference (ProjectEntity.lead allows it), and
    // edit mode never shows Step 0 to fix that, so it must not be a hard
    // validation gate there.
    resolver: zodResolver(isEdit ? editProjectWizardSchema : createProjectWizardSchema),
    mode: 'onChange',
    // Switching execution mode (po/agreement/mail_confirmation) must not
    // erase the other modes' already-entered fields — matches today's real
    // behavior, where the old useState object never dropped fields on mode change.
    shouldUnregister: false,
    defaultValues: editProject ? projectToForm(editProject) : createDefaultWizardForm(),
  })
  const { control, handleSubmit, trigger, reset, formState: { isSubmitting } } = form
  const nameValue = useWatch({ control, name: 'name' })

  const createProject = useCreateProject()
  const updateProject = useUpdateProject()

  const lastStep = STEPS.length - 1

  const handleResumeDraft = () => {
    if (!draftStore) return
    const draft = draftStore.getState().draft
    // Merged against fresh defaults, not a raw reset(draft) — RHF's reset()
    // fully replaces form values with exactly what's given (it does not
    // merge against defaultValues for omitted keys), so a same-version draft
    // saved by an older running tab (before a field was added to
    // WizardFormState) could otherwise resume with a field genuinely
    // undefined, crashing a step that assumes it's always at least `[]`/`''`.
    if (draft) reset({ ...createDefaultWizardForm(), ...draft })
    setDraftMode('active')
  }

  const handleDiscardDraft = () => {
    draftStore?.getState().clearDraft()
    reset(createDefaultWizardForm())
    setDraftMode('active')
  }

  const handleNext = async () => {
    setAttemptedFields((prev) => new Set([...prev, ...activeStepFieldNames[step]]))
    const valid = await trigger(activeStepFieldNames[step])
    if (!valid) return
    if (step < lastStep) setStep(step + 1)
  }

  const handleBack = () => setStep((s) => Math.max(0, s - 1))

  const onSubmit = async (values: WizardFormState) => {
    const mode: ExecutionMode = {
      mode: values.mode,
      ...(values.mode === 'po' ? { poNumber: values.poNumber, poDate: values.poDate, poExpiry: values.poExpiry || undefined } : {}),
      ...(values.mode === 'agreement'
        ? { agreementNumber: values.agreementNumber || undefined, agreementStartDate: values.agreementStartDate, agreementEndDate: values.agreementEndDate || undefined, duration: values.duration || undefined, agreementDocument: values.agreementDocument || undefined }
        : {}),
      ...(values.mode === 'mail_confirmation' ? { emailReference: values.emailReference, emailDocument: values.emailDocument || undefined } : {}),
    }

    // Every field common to both Create and Update — required on Create,
    // optional on Update.
    const commonFields = {
      name: values.name,
      therapy: values.therapy as ProjectTherapy,
      type: values.type,
      tests: values.tests,
      mode,
      campCost: values.campCost,
      totalCamps: values.totalCamps,
      gst: values.gst,
      valueBeforeGST: values.valueBeforeGST,
      additionalCost: values.additionalCost,
      campTimeSlots: values.campTimeSlots,
      freeCancelHours: values.freeCancelHours,
      cancellationAllowed: values.cancellationAllowed,
      campCostDeductionOnChargableCancel: values.campCostDeductionOnChargableCancel,
      goLiveScope: { code: values.goLiveScopeCode, values: values.goLiveScopeValues },
      whoCanBookCamp: values.whoCanBookCamp,
      salesRep: values.salesRep,
      projectCoordinator: values.projectCoordinator,
      marketingContact: values.marketingContact,
      paymentTerms: values.paymentTerms,
      daysToBookBefore: values.daysToBookBefore,
      dietChart: values.dietChart,
      poRenewalReminder: values.poRenewalReminder,
      clientReportCandance: values.clientReportCandance,
      availablePointers: values.availablePointers,
      tats: values.tats,
      sops: values.sops,
    }

    try {
      if (isEdit && editProject) {
        const updatePayload: UpdateProjectPayload = commonFields
        await updateProject.mutateAsync({ id: editProject.id, payload: updatePayload })
        onSaved(editProject.id)
      } else {
        const createPayload: CreateProjectPayload = { lead: values.leadId, ...commonFields }
        const res = await createProject.mutateAsync(createPayload)
        // Stop the sync BEFORE clearing — otherwise ProjectDraftSync's own
        // flush-on-unmount (fired when onClose() below unmounts it moments
        // later) could re-write the draft right after it's cleared.
        stopSync?.()
        draftStore?.getState().clearDraft()
        toast.success('Project created')
        if (res.data) onSaved(res.data.id)
      }
      onClose()
    } catch {
      toast.error(isEdit ? 'Could not save changes — try again.' : 'Could not create the project — try again.')
    }
  }

  // Final submit still needs its own attempted-fields flush so the last
  // step's errors show even if the user never clicked Next from it (e.g.
  // hitting Enter, or the submit button, directly on the last step).
  const guardedSubmit = handleSubmit((values) => {
    setAttemptedFields((prev) => new Set([...prev, ...activeStepFieldNames[lastStep]]))
    return onSubmit(values)
  })

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
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded-[10px] border p-1.5"
            style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
          >
            <FiX size={16} />
          </button>
        </div>

        {draftMode === 'loading' && <DraftLoadingPlaceholder />}
        {draftMode === 'pending-decision' && (
          <DraftResumeDecision itemLabel="project" onResume={handleResumeDraft} onDiscard={handleDiscardDraft} />
        )}

        {(draftMode === 'active' || draftMode === 'disabled') && (
          <FormProvider {...form}>
            {draftMode === 'active' && draftStore && (
              <ProjectDraftSync store={draftStore} onStopChange={setStopSync} />
            )}
            <WizardValidationProvider value={{ attemptedFields }}>
              <form onSubmit={guardedSubmit} noValidate className="flex-1 flex flex-col overflow-hidden">
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

                  {!isEdit && step === 0 && <WizardStep0 />}
                  {step === (isEdit ? 0 : 1) && <WizardStep1 />}
                  {step === (isEdit ? 1 : 2) && <WizardStep2 />}
                  {step === (isEdit ? 2 : 3) && <WizardStep3 />}
                  {step === (isEdit ? 3 : 4) && <WizardStep4 />}
                  {step === (isEdit ? 4 : 5) && <WizardStep5 />}
                  {step === (isEdit ? 5 : 6) && <WizardStep6 />}
                </div>

                <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-3" style={{ borderTop: '1px solid var(--qms-border)' }}>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                    {nameValue || '(no name)'}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex gap-2">
                      {step > 0
                        ? <Button type="button" variant="ghost" onClick={handleBack} style={{ border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}><FiArrowLeft size={14} /> Back</Button>
                        : <Button type="button" variant="ghost" onClick={onClose} style={{ border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}>Cancel</Button>}
                      {step < lastStep ? (
                        <Button type="button" onClick={handleNext} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), #3b6dff 60%, var(--qms-teal))' }}>
                          Next <FiArrowRight size={14} />
                        </Button>
                      ) : (
                        <Button type="submit" disabled={isSubmitting} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), #3b6dff 60%, var(--qms-teal))' }}>
                          <FiSave size={14} /> {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create project'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </WizardValidationProvider>
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default NewProjectWizard
