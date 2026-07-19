import { useEffect, useMemo, useState } from 'react'
import {
  FiX, FiAlertTriangle, FiMapPin, FiCamera, FiCheck, FiChevronLeft, FiChevronRight, FiUsers, FiCheckCircle, FiPackage,
} from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import type { Camp, RunCampScreeningResult, RunCampSummary } from '@/types/camp.types'
import type { Person } from '@/types/people.types'
import { useProjectsDataShared } from '@/hooks/useProjectsDataShared'
import { useFoConsumables, useFoIncidents } from '@/features/fo/hooks/useFo'
import { resolveForCamp } from '@/features/fo/foConfig.service'
import type { FoProjectConfig } from '@/features/fo/foConfig.types'

import CheckInStage from '@/features/fo/components/runcamp/CheckInStage'
import SetupPhotoStage from '@/features/fo/components/runcamp/SetupPhotoStage'
import ConsumablesStage from '@/features/fo/components/runcamp/ConsumablesStage'
import ScreeningStage from '@/features/fo/components/runcamp/ScreeningStage'
import ClosureStage, { computeFinalStatus, type FinalCheck } from '@/features/fo/components/runcamp/ClosureStage'

const SETUP_PHOTO_KEY = 'setup'

type StageId = 'checkin' | 'setup' | 'consum' | 'screening' | 'closure'

const STAGES: { id: StageId; label: string; icon: typeof FiMapPin }[] = [
  { id: 'checkin', label: 'Check-in', icon: FiMapPin },
  { id: 'setup', label: 'Setup photos', icon: FiCamera },
  { id: 'consum', label: 'Consumables · FIFO', icon: FiPackage },
  { id: 'screening', label: 'Patient screenings', icon: FiUsers },
  { id: 'closure', label: 'Wastage + Close', icon: FiCheckCircle },
]

interface WastageRow { consumableId: string; qty: number; reason: string }

interface RunCampWizardProps {
  open: boolean
  campId: string
  camp: Camp
  me: Person
  onClose: () => void
  onSaveCamp: (patch: Partial<Camp>) => void
}

// Draft shape mirrors the Camp type's run-camp fields exactly — initialized
// from the passed-in camp so reopening a partially-completed camp resumes.
function draftFromCamp(camp: Camp) {
  return {
    checkInAt: camp.checkInAt,
    checkInGeo: camp.checkInGeo ?? null,
    selfieDataUrl: camp.selfieDataUrl,
    checkInDelayMins: camp.checkInDelayMins,
    checkInDelayReason: camp.checkInDelayReason,
    setupPhotos: camp.setupPhotos ?? {},
    additionalPhotos: camp.additionalPhotos ?? {},
    closurePhoto: camp.closurePhoto,
    wastage: (camp.wastage ?? []) as WastageRow[],
    extraConsumables: (camp.extraConsumables ?? []) as WastageRow[],
    consumableDeductions: camp.consumableDeductions ?? [],
    selectedLots: camp.selectedLots ?? [],
    screeningResults: camp.screeningResults ?? ([] as RunCampScreeningResult[]),
    runFoRemarks: camp.runFoRemarks ?? '',
    runMrAvailable: camp.runMrAvailable ?? '',
    runMrAvailabilityHrs: camp.runMrAvailabilityHrs ?? '',
    runDoctorAvailabilityHrs: camp.runDoctorAvailabilityHrs ?? '',
    runMrFeedbackRating: camp.runMrFeedbackRating ?? 0,
    runMrFeedback: camp.runMrFeedback ?? '',
    runIncidentReport: camp.runIncidentReport ?? '',
    closedAt: camp.closedAt,
    statusReason: camp.statusReason,
    foReportUploadedAt: camp.foReportUploadedAt,
  }
}

type Draft = ReturnType<typeof draftFromCamp>

const RunCampWizard = ({ open, campId, camp, me, onClose, onSaveCamp }: RunCampWizardProps) => {
  const { projects } = useProjectsDataShared()
  const { consumables } = useFoConsumables(me.id)
  const { raiseIncident } = useFoIncidents(me.id)

  const [stageIdx, setStageIdx] = useState(0)
  const [draft, setDraft] = useState<Draft>(() => draftFromCamp(camp))
  const [reportsUploaded, setReportsUploaded] = useState(!!camp.foReportUploadedAt)
  const [sosOpen, setSosOpen] = useState(false)
  const [sosNote, setSosNote] = useState('')
  const [cfg, setCfg] = useState<(FoProjectConfig & { source: 'project' | 'default' }) | null>(null)

  // Reset local draft whenever a different camp is opened.
  useEffect(() => {
    if (!open) return
    setDraft(draftFromCamp(camp))
    setReportsUploaded(!!camp.foReportUploadedAt)
    setStageIdx(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campId])

  const project = useMemo(() => projects.find((p) => p.id === camp.projectId), [projects, camp.projectId])

  useEffect(() => {
    let cancelled = false
    resolveForCamp(camp, project).then((c) => { if (!cancelled) setCfg(c) })
    return () => { cancelled = true }
  }, [camp, project])

  const patch = (fields: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...fields }))

  const persist = (fields: Partial<Camp>) => onSaveCamp(fields)

  const isStageDone = (id: StageId): boolean => {
    if (id === 'checkin') return !!draft.checkInAt
    if (id === 'setup') return !!draft.setupPhotos[SETUP_PHOTO_KEY]
    if (id === 'consum') return true
    if (id === 'screening') return draft.screeningResults.length > 0
    if (id === 'closure') return !!draft.closedAt
    return false
  }

  const currentStage = STAGES[stageIdx]

  const goToStage = (idx: number) => {
    // Persist progressively on every stage transition.
    persist(draft as Partial<Camp>)
    setStageIdx(idx)
  }

  const handleBack = () => { if (stageIdx > 0) goToStage(stageIdx - 1) }
  const handleNext = () => { if (stageIdx < STAGES.length - 1) goToStage(stageIdx + 1) }

  const handleClose = () => {
    persist(draft as Partial<Camp>)
    onClose()
  }

  // --- Stage 1: Check-in ---
  const handleCheckIn = (fields: { checkInAt: string; checkInGeo: { lat: number; lng: number; accuracy?: number }; selfieDataUrl: string; checkInDelayMins: number }) => {
    const next = { ...draft, ...fields }
    setDraft(next)
    persist(fields)
    toast.success('Checked in')
  }

  const handleSaveDelayReason = (reason: string, notes: string) => {
    const combined = notes ? `${reason} — ${notes}` : reason
    patch({ checkInDelayReason: combined })
    persist({ checkInDelayReason: combined })
    toast.success('Delay reason saved')
  }

  // --- Stage 2: Setup photo ---
  const handleSetupCapture = (key: string, dataUrl: string) => {
    const nextPhotos = { ...draft.setupPhotos, [key]: dataUrl }
    patch({ setupPhotos: nextPhotos })
    persist({ setupPhotos: nextPhotos })
  }

  // --- Stage 3: Consumables (auto FIFO) ---
  const handleResolveLots = (lotIds: string[]) => {
    setDraft((prev) => {
      const same = prev.selectedLots.length === lotIds.length && prev.selectedLots.every((id, i) => id === lotIds[i])
      if (same) return prev
      const next = { ...prev, selectedLots: lotIds }
      persist({ selectedLots: lotIds })
      return next
    })
  }

  // --- Stage 4: Screenings ---
  const handleAddPatient = (result: RunCampScreeningResult) => {
    const nextResults = [...draft.screeningResults, result]

    // Best-effort consumable deduction push (no real inventory mutation in
    // this pass) — per-test mapping via the same consumable ids the
    // Consumables stage resolves against.
    const nextDeductions = [...draft.consumableDeductions]
    for (const testId of Object.keys(result.results)) {
      const existing = nextDeductions.find((d) => d.consumableId === testId)
      if (existing) existing.qty += 1
      else nextDeductions.push({ consumableId: testId, qty: 1 })
    }

    patch({ screeningResults: nextResults, consumableDeductions: nextDeductions })
    persist({ screeningResults: nextResults, consumableDeductions: nextDeductions })
    toast.success(`${result.name} added`)
  }

  // --- Stage 5: Wastage + Closure ---
  const handleCaptureAdditional = (key: string, dataUrl: string) => {
    const next = { ...draft.additionalPhotos, [key]: dataUrl }
    patch({ additionalPhotos: next })
    persist({ additionalPhotos: next })
  }

  const handleCaptureClosure = (dataUrl: string) => {
    patch({ closurePhoto: dataUrl })
    persist({ closurePhoto: dataUrl })
  }

  const buildSummary = (finalStatus: FinalCheck): RunCampSummary => {
    const genderBreakdown = { M: 0, F: 0, O: 0 }
    const testCounts: Record<string, number> = {}
    const consumableTotals: Record<string, number> = {}
    let criticalFindings = 0
    let doctorReferrals = 0
    for (const r of draft.screeningResults) {
      const g = (r.gender || '').toLowerCase()
      if (g.startsWith('m')) genderBreakdown.M += 1
      else if (g.startsWith('f')) genderBreakdown.F += 1
      else genderBreakdown.O += 1
      if (r.criticalFinding) criticalFindings += 1
      if (r.referredToDoctor) doctorReferrals += 1
      for (const testId of Object.keys(r.results || {})) testCounts[testId] = (testCounts[testId] ?? 0) + 1
    }
    for (const d of draft.consumableDeductions) consumableTotals[d.consumableId] = (consumableTotals[d.consumableId] ?? 0) + d.qty

    void finalStatus
    return {
      totalPatients: draft.screeningResults.length,
      genderBreakdown,
      criticalFindings,
      doctorReferrals,
      testCounts,
      consumableTotals,
      wastageEntries: draft.wastage.length,
      extraConsumableEntries: draft.extraConsumables.length,
      additionalPhotoCount: Object.keys(draft.additionalPhotos).length,
      delayMins: draft.checkInDelayMins,
      delayReason: draft.checkInDelayReason,
      generatedAt: new Date().toISOString(),
    }
  }

  const handleCloseCamp = (finalCheck: FinalCheck) => {
    const now = new Date().toISOString()
    const summary = buildSummary(finalCheck)

    if (draft.runIncidentReport.trim()) {
      raiseIncident({
        category: 'other',
        campId: camp.id,
        title: `Camp run incident — ${camp.id}`,
        notes: draft.runIncidentReport,
        raisedById: me.id,
        raisedByName: me.name,
        foId: me.id,
        foName: me.name,
        severity: 'MED',
      }).catch(() => {})
      toast.info('Incident raised from your incident report')
    }

    const fullPatch: Partial<Camp> = {
      ...draft,
      closedAt: now,
      status: finalCheck.status,
      statusReason: finalCheck.reason,
      runSummary: summary,
      criticalFindings: summary.criticalFindings,
      ...(finalCheck.status === 'COMPLETE' ? { foReportUploadedAt: now } : {}),
    }
    setDraft((prev) => ({ ...prev, closedAt: now, statusReason: finalCheck.reason }))
    persist(fullPatch)
    toast.success(`Camp closed · ${finalCheck.status.replace(/_/g, ' ')}`)
  }

  const handleSos = () => {
    if (!sosNote.trim()) { toast.error('Describe the emergency briefly'); return }
    toast.info('SOS flow — see Incidents module for full escalation.')
    raiseIncident({
      category: 'sos',
      campId: camp.id,
      title: `SOS raised — ${camp.id}`,
      notes: sosNote,
      raisedById: me.id,
      raisedByName: me.name,
      foId: me.id,
      foName: me.name,
      severity: 'CRITICAL',
    }).catch(() => {})
    setSosNote('')
    setSosOpen(false)
  }

  if (!open) return null

  const stageDone = isStageDone(currentStage.id)
  const finalCheckPreview = computeFinalStatus({
    checkedIn: !!draft.checkInAt,
    setupPhotoDone: !!draft.setupPhotos[SETUP_PHOTO_KEY],
    screeningCount: draft.screeningResults.length,
    reportsUploaded,
  })

  return (
    <div className="fixed inset-0 z-60 flex flex-col" style={{ background: 'var(--qms-surface-strong)' }}>
      {/* Header */}
      <div className="shrink-0 border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{camp.id}</span>
            <span className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{camp.city} · {camp.type} · {camp.date?.slice(0, 10)} · {camp.slot}</span>
          </div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-soft)' }}>Run Camp wizard</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="destructive" onClick={() => setSosOpen(true)}><FiAlertTriangle size={13} /> SOS</Button>
          <Button size="icon-sm" variant="ghost" onClick={handleClose} aria-label="Close wizard"><FiX size={16} /></Button>
        </div>
      </div>

      {/* Stepper */}
      <div className="shrink-0 border-b px-4 sm:px-6 py-3 overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-1.5 min-w-max">
          {STAGES.map((s, i) => {
            const done = isStageDone(s.id)
            const isCurrent = i === stageIdx
            const Icon = s.icon
            return (
              <div key={s.id} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToStage(i)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-full transition-colors"
                  style={
                    isCurrent
                      ? { background: 'color-mix(in oklab, var(--qms-brand) 10%, transparent)', border: '1.5px solid var(--qms-brand)' }
                      : { border: '1.5px solid transparent' }
                  }
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={
                      done
                        ? { background: 'var(--success)', color: '#fff' }
                        : isCurrent
                        ? { background: 'var(--qms-surface)', color: 'var(--qms-brand)', border: '1.5px solid var(--qms-brand)' }
                        : { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)', border: '1.5px solid var(--qms-border)' }
                    }
                  >
                    {done ? <FiCheck size={12} /> : <Icon size={11} />}
                  </span>
                  <span
                    className="text-[12px] font-semibold whitespace-nowrap"
                    style={{ color: isCurrent ? 'var(--qms-brand)' : done ? 'var(--qms-text)' : 'var(--qms-text-muted)' }}
                  >
                    {i + 1}. {s.label}
                  </span>
                </button>
                {i < STAGES.length - 1 && (
                  <div className="w-8 h-0.5 rounded-full shrink-0" style={{ background: done ? 'var(--success)' : 'var(--qms-border)' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {currentStage.id === 'checkin' && (
          <CheckInStage
            campSlot={camp.slot}
            campDate={camp.date}
            checkInAt={draft.checkInAt}
            checkInGeo={draft.checkInGeo}
            selfieDataUrl={draft.selfieDataUrl}
            checkInDelayMins={draft.checkInDelayMins}
            checkInDelayReason={draft.checkInDelayReason}
            onCheckIn={handleCheckIn}
            onSaveDelayReason={handleSaveDelayReason}
          />
        )}

        {currentStage.id === 'setup' && (
          <SetupPhotoStage setupPhotos={draft.setupPhotos} onCapture={handleSetupCapture} />
        )}

        {currentStage.id === 'consum' && (
          <ConsumablesStage camp={camp} project={project} consumables={consumables} onResolveLots={handleResolveLots} />
        )}

        {currentStage.id === 'screening' && (
          <ScreeningStage
            screeningResults={draft.screeningResults}
            patientFields={cfg?.patientFields}
            testIds={cfg?.tests}
            onAddPatient={handleAddPatient}
          />
        )}

        {currentStage.id === 'closure' && (
          <ClosureStage
            checkedIn={!!draft.checkInAt}
            setupPhotoDone={!!draft.setupPhotos[SETUP_PHOTO_KEY]}
            screeningResults={draft.screeningResults}
            consumables={consumables}
            additionalPhotos={draft.additionalPhotos}
            onCaptureAdditional={handleCaptureAdditional}
            closurePhoto={draft.closurePhoto}
            onCaptureClosure={handleCaptureClosure}
            wastage={draft.wastage}
            onWastageChange={(rows) => { patch({ wastage: rows }); persist({ wastage: rows }) }}
            extraConsumables={draft.extraConsumables}
            onExtraConsumablesChange={(rows) => { patch({ extraConsumables: rows }); persist({ extraConsumables: rows }) }}
            runFoRemarks={draft.runFoRemarks}
            onRemarksChange={(v) => patch({ runFoRemarks: v })}
            runMrAvailable={draft.runMrAvailable}
            onMrAvailableChange={(v) => patch({ runMrAvailable: v })}
            runMrAvailabilityHrs={draft.runMrAvailabilityHrs}
            onMrAvailabilityHrsChange={(v) => patch({ runMrAvailabilityHrs: v })}
            runDoctorAvailabilityHrs={draft.runDoctorAvailabilityHrs}
            onDoctorAvailabilityHrsChange={(v) => patch({ runDoctorAvailabilityHrs: v })}
            runMrFeedbackRating={draft.runMrFeedbackRating}
            onMrFeedbackRatingChange={(v) => patch({ runMrFeedbackRating: v })}
            runMrFeedback={draft.runMrFeedback}
            onMrFeedbackChange={(v) => patch({ runMrFeedback: v })}
            runIncidentReport={draft.runIncidentReport}
            onIncidentReportChange={(v) => patch({ runIncidentReport: v })}
            reportsUploaded={reportsUploaded}
            onReportsUploadedChange={setReportsUploaded}
            delayMins={draft.checkInDelayMins}
            delayReason={draft.checkInDelayReason}
            closedAt={draft.closedAt}
            onCloseCamp={handleCloseCamp}
          />
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t px-4 sm:px-6 py-3 flex items-center justify-between gap-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <Button variant="outline" size="sm" disabled={stageIdx === 0} onClick={handleBack}><FiChevronLeft size={13} /> Back</Button>
        <div className="text-[11.5px] text-center flex-1" style={{ color: 'var(--qms-text-muted)' }}>
          {currentStage.id === 'closure'
            ? (draft.closedAt ? `Closed · ${finalCheckPreview.status.replace(/_/g, ' ')}` : 'Use "Close camp" below to finish')
            : !stageDone ? `Complete "${currentStage.label}" to continue` : 'Ready to continue'}
        </div>
        {stageIdx < STAGES.length - 1 ? (
          <Button size="sm" disabled={!stageDone} onClick={handleNext}>Next <FiChevronRight size={13} /></Button>
        ) : draft.closedAt ? (
          <Button size="sm" disabled><FiCheck size={13} /> Camp closed</Button>
        ) : (
          <Button size="sm" variant="outline" disabled><FiCheck size={13} /> Close via body button</Button>
        )}
      </div>

      {/* SOS mini-form */}
      <Dialog open={sosOpen} onOpenChange={(o) => !o && setSosOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Raise SOS</DialogTitle></DialogHeader>
          <div className="flex items-start gap-2 text-[12.5px] rounded-lg px-3 py-2.5" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <FiAlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>This raises a CRITICAL incident against this camp for immediate attention. Full escalation continues in the Incidents module.</span>
          </div>
          <Textarea placeholder="Briefly describe the emergency…" value={sosNote} onChange={(e) => setSosNote(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSosOpen(false)}>Cancel</Button>
            <Button style={{ background: 'var(--danger)' }} onClick={handleSos}><FiAlertTriangle size={13} /> Raise SOS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RunCampWizard
