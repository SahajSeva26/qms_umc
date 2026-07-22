import { useMemo, useState } from 'react'
import { FiCamera, FiPlus, FiTrash2, FiFileText, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import CameraGeoCapture, { type CaptureResult } from '@/components/ui/CameraGeoCapture'
import { DEFAULT_ADDITIONAL_PHOTOS } from '@/features/fo/foConfig.types'
import type { RunCampScreeningResult } from '@/types/camp.types'
import type { ConsumableLot } from '@/features/fo/fo.types'

export type FinalStatus = 'INCOMPLETE' | 'COMPLETE_WITHOUT_REPORT' | 'COMPLETE'

export interface FinalCheck {
  status: FinalStatus
  reason: string
}

// Status cascade — this build's deliberate bug-fix over the prototype's own
// unreachable COMPLETE_WITHOUT_REPORT branch: gate COMPLETE vs
// COMPLETE_WITHOUT_REPORT on a distinct "reports uploaded" toggle the FO must
// explicitly check, instead of re-testing the already-checked screenings
// count (which the prototype re-used, making that branch unreachable).
export function computeFinalStatus(args: {
  checkedIn: boolean
  setupPhotoDone: boolean
  screeningCount: number
  reportsUploaded: boolean
}): FinalCheck {
  if (!args.checkedIn) return { status: 'INCOMPLETE', reason: 'Check-in missing' }
  if (!args.setupPhotoDone) return { status: 'INCOMPLETE', reason: 'Setup photos missing' }
  if (args.screeningCount === 0) return { status: 'INCOMPLETE', reason: 'No patient screenings' }
  if (!args.reportsUploaded) return { status: 'COMPLETE_WITHOUT_REPORT', reason: 'Patient screenings done · reports pending' }
  return { status: 'COMPLETE', reason: 'All mandatory steps complete' }
}

interface WastageRow { consumableId: string; qty: number; reason: string }

interface ClosureStageProps {
  checkedIn: boolean
  setupPhotoDone: boolean
  screeningResults: RunCampScreeningResult[]
  consumables: ConsumableLot[]
  additionalPhotos?: Record<string, string>
  onCaptureAdditional: (key: string, dataUrl: string) => void
  closurePhoto?: string
  onCaptureClosure: (dataUrl: string) => void
  wastage: WastageRow[]
  onWastageChange: (rows: WastageRow[]) => void
  extraConsumables: WastageRow[]
  onExtraConsumablesChange: (rows: WastageRow[]) => void
  runFoRemarks: string
  onRemarksChange: (v: string) => void
  runMrAvailable: string
  onMrAvailableChange: (v: string) => void
  runMrAvailabilityHrs: string
  onMrAvailabilityHrsChange: (v: string) => void
  runDoctorAvailabilityHrs: string
  onDoctorAvailabilityHrsChange: (v: string) => void
  runMrFeedbackRating: number
  onMrFeedbackRatingChange: (v: number) => void
  runMrFeedback: string
  onMrFeedbackChange: (v: string) => void
  runIncidentReport: string
  onIncidentReportChange: (v: string) => void
  reportsUploaded: boolean
  onReportsUploadedChange: (v: boolean) => void
  delayMins?: number
  delayReason?: string
  closedAt?: string
  onCloseCamp: (finalCheck: FinalCheck) => void
}

const HRS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '8+']
const MR_AVAIL_OPTIONS = ['Available — full day', 'Available — partial', 'Not available']
const RATING_OPTIONS = [0, 1, 2, 3, 4, 5]

function emptyRow(): WastageRow {
  return { consumableId: '', qty: 0, reason: '' }
}

const ClosureStage = ({
  checkedIn, setupPhotoDone, screeningResults, consumables,
  additionalPhotos, onCaptureAdditional, closurePhoto, onCaptureClosure,
  wastage, onWastageChange, extraConsumables, onExtraConsumablesChange,
  runFoRemarks, onRemarksChange,
  runMrAvailable, onMrAvailableChange, runMrAvailabilityHrs, onMrAvailabilityHrsChange,
  runDoctorAvailabilityHrs, onDoctorAvailabilityHrsChange,
  runMrFeedbackRating, onMrFeedbackRatingChange, runMrFeedback, onMrFeedbackChange,
  runIncidentReport, onIncidentReportChange,
  reportsUploaded, onReportsUploadedChange,
  delayMins, delayReason, closedAt, onCloseCamp,
}: ClosureStageProps) => {
  const [captureKey, setCaptureKey] = useState<string | null>(null)
  const [closureCaptureOpen, setClosureCaptureOpen] = useState(false)
  const [confirmIncompleteOpen, setConfirmIncompleteOpen] = useState(false)

  const summary = useMemo(() => {
    const genderBreakdown = { M: 0, F: 0, O: 0 }
    const testCounts: Record<string, number> = {}
    let criticalFindings = 0
    let doctorReferrals = 0
    for (const r of screeningResults) {
      const g = (r.gender || '').toLowerCase()
      if (g.startsWith('m')) genderBreakdown.M += 1
      else if (g.startsWith('f')) genderBreakdown.F += 1
      else genderBreakdown.O += 1
      if (r.criticalFinding) criticalFindings += 1
      if (r.referredToDoctor) doctorReferrals += 1
      for (const testId of Object.keys(r.results || {})) {
        testCounts[testId] = (testCounts[testId] ?? 0) + 1
      }
    }
    return { totalPatients: screeningResults.length, genderBreakdown, criticalFindings, doctorReferrals, testCounts }
  }, [screeningResults])

  const consumablesDeducted = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const r of screeningResults) {
      for (const testId of Object.keys(r.results || {})) {
        totals[testId] = (totals[testId] ?? 0) + 1
      }
    }
    return totals
  }, [screeningResults])

  const finalCheck = computeFinalStatus({ checkedIn, setupPhotoDone, screeningCount: screeningResults.length, reportsUploaded })

  const handleAddWastage = () => onWastageChange([...wastage, emptyRow()])
  const handleWastageRowChange = (i: number, patch: Partial<WastageRow>) =>
    onWastageChange(wastage.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const handleRemoveWastage = (i: number) => onWastageChange(wastage.filter((_, idx) => idx !== i))

  const handleAddExtra = () => onExtraConsumablesChange([...extraConsumables, emptyRow()])
  const handleExtraRowChange = (i: number, patch: Partial<WastageRow>) =>
    onExtraConsumablesChange(extraConsumables.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const handleRemoveExtra = (i: number) => onExtraConsumablesChange(extraConsumables.filter((_, idx) => idx !== i))

  const handleIncidentBlur = () => {
    if (runIncidentReport.trim()) {
      toast.info('An incident would be auto-raised from this report on close.')
    }
  }

  const handleClosureConfirm = (result: CaptureResult) => {
    onCaptureClosure(result.dataUrl)
    setClosureCaptureOpen(false)
  }

  const handleAdditionalConfirm = (result: CaptureResult) => {
    if (captureKey) onCaptureAdditional(captureKey, result.dataUrl)
    setCaptureKey(null)
  }

  const handleCloseClick = () => {
    if (finalCheck.status === 'INCOMPLETE') { setConfirmIncompleteOpen(true); return }
    onCloseCamp(finalCheck)
  }

  const statusMeta: Record<FinalStatus, { label: string; bg: string; color: string }> = {
    INCOMPLETE: { label: 'INCOMPLETE', bg: 'var(--danger-soft)', color: 'var(--danger)' },
    COMPLETE_WITHOUT_REPORT: { label: 'COMPLETE · REPORTS PENDING', bg: 'var(--warning-soft)', color: 'var(--warning)' },
    COMPLETE: { label: 'COMPLETE', bg: 'var(--success-soft)', color: 'var(--success)' },
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <section className="space-y-2">
        <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Additional photos (optional)</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {DEFAULT_ADDITIONAL_PHOTOS.map((slot) => {
            const photo = additionalPhotos?.[slot.id]
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setCaptureKey(slot.id)}
                className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 overflow-hidden aspect-square"
                style={{ borderColor: photo ? 'var(--success)' : 'var(--qms-border)', background: 'var(--qms-surface)' }}
              >
                {photo ? (
                  <img src={photo} alt={slot.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 px-2 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                    <FiCamera size={18} />
                    <span className="text-[10.5px] font-semibold">{slot.label}</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Wastage</div>
          <Button size="sm" variant="outline" onClick={handleAddWastage}><FiPlus size={12} /> Add row</Button>
        </div>
        <div className="space-y-2">
          {wastage.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select value={row.consumableId || '__none__'} onValueChange={(v) => handleWastageRowChange(i, { consumableId: v === '__none__' ? '' : (v ?? '') })}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Consumable" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select…</SelectItem>
                  {consumables.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" className="w-20" placeholder="Qty" value={row.qty || ''} onChange={(e) => handleWastageRowChange(i, { qty: Number(e.target.value) || 0 })} />
              <Input className="flex-1" placeholder="Reason" value={row.reason} onChange={(e) => handleWastageRowChange(i, { reason: e.target.value })} />
              <Button size="icon-sm" variant="ghost" onClick={() => handleRemoveWastage(i)}><FiTrash2 size={13} /></Button>
            </div>
          ))}
          {wastage.length === 0 && <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No wastage recorded.</div>}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Extra consumables used</div>
          <Button size="sm" variant="outline" onClick={handleAddExtra}><FiPlus size={12} /> Add row</Button>
        </div>
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Repeat testing / damaged strips / emergency consumption.</div>
        <div className="space-y-2">
          {extraConsumables.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select value={row.consumableId || '__none__'} onValueChange={(v) => handleExtraRowChange(i, { consumableId: v === '__none__' ? '' : (v ?? '') })}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Consumable" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select…</SelectItem>
                  {consumables.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" className="w-20" placeholder="Qty" value={row.qty || ''} onChange={(e) => handleExtraRowChange(i, { qty: Number(e.target.value) || 0 })} />
              <Input className="flex-1" placeholder="Reason" value={row.reason} onChange={(e) => handleExtraRowChange(i, { reason: e.target.value })} />
              <Button size="icon-sm" variant="ghost" onClick={() => handleRemoveExtra(i)}><FiTrash2 size={13} /></Button>
            </div>
          ))}
          {extraConsumables.length === 0 && <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>None recorded.</div>}
        </div>
      </section>

      <section className="flex items-center justify-between rounded-lg border px-3.5 py-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
        <div className="text-[12.5px]" style={{ color: 'var(--qms-text-muted)' }}>On-site expenses can be filed from the Expenses module.</div>
        <Button size="sm" variant="outline" onClick={() => toast.info('Opening Expenses module — file your claim there.')}><FiFileText size={12} /> File claim</Button>
      </section>

      <section className="space-y-1.5">
        <label className="block text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>FO remarks</label>
        <Textarea value={runFoRemarks} onChange={(e) => onRemarksChange(e.target.value)} rows={2} />
      </section>

      <section className="space-y-2">
        <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Closure photo (optional)</div>
        <button
          type="button"
          onClick={() => setClosureCaptureOpen(true)}
          className="rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden"
          style={{ borderColor: closurePhoto ? 'var(--success)' : 'var(--qms-border)', height: 120, width: 160, background: 'var(--qms-surface)' }}
        >
          {closurePhoto ? <img src={closurePhoto} alt="Closure" className="w-full h-full object-cover" /> : <FiCamera size={20} style={{ color: 'var(--qms-text-muted)' }} />}
        </button>
      </section>

      <section className="space-y-3">
        <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Stakeholder availability</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>MR availability</label>
            <Select value={runMrAvailable || '__blank__'} onValueChange={(v) => onMrAvailableChange(v === '__blank__' ? '' : (v ?? ''))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__blank__">—</SelectItem>
                {MR_AVAIL_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>MR present hrs</label>
            <Select value={runMrAvailabilityHrs || '__blank__'} onValueChange={(v) => onMrAvailabilityHrsChange(v === '__blank__' ? '' : (v ?? ''))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__blank__">—</SelectItem>
                {HRS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Doctor availability hrs</label>
            <Select value={runDoctorAvailabilityHrs || '__blank__'} onValueChange={(v) => onDoctorAvailabilityHrsChange(v === '__blank__' ? '' : (v ?? ''))}>
              <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__blank__">—</SelectItem>
                {HRS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>MR feedback rating</label>
            <Select value={String(runMrFeedbackRating ?? 0)} onValueChange={(v) => onMrFeedbackRatingChange(Number(v) || 0)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n === 0 ? 'Not rated' : `${n} star${n > 1 ? 's' : ''}`}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>MR feedback</label>
          <Textarea value={runMrFeedback} onChange={(e) => onMrFeedbackChange(e.target.value)} rows={2} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Incident report</label>
          <Textarea value={runIncidentReport} onChange={(e) => onIncidentReportChange(e.target.value)} onBlur={handleIncidentBlur} rows={2} />
        </div>
      </section>

      <section className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Camp summary</div>
        <div className="p-3.5 grid grid-cols-2 gap-3 text-[12.5px]">
          <div><span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{summary.totalPatients}</span> <span style={{ color: 'var(--qms-text-muted)' }}>total patients</span></div>
          <div><span className="font-semibold" style={{ color: 'var(--danger)' }}>{summary.criticalFindings}</span> <span style={{ color: 'var(--qms-text-muted)' }}>critical findings</span></div>
          <div><span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{summary.doctorReferrals}</span> <span style={{ color: 'var(--qms-text-muted)' }}>doctor referrals</span></div>
          <div style={{ color: 'var(--qms-text-muted)' }}>M {summary.genderBreakdown.M} · F {summary.genderBreakdown.F} · O {summary.genderBreakdown.O}</div>
          <div className="col-span-2">
            <div className="font-semibold mb-1" style={{ color: 'var(--qms-text)' }}>Tests performed</div>
            {Object.keys(summary.testCounts).length === 0 ? (
              <div style={{ color: 'var(--qms-text-muted)' }}>None yet</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(summary.testCounts).map(([t, n]) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>{t} × {n}</span>
                ))}
              </div>
            )}
          </div>
          <div className="col-span-2">
            <div className="font-semibold mb-1" style={{ color: 'var(--qms-text)' }}>Consumables deducted</div>
            {Object.keys(consumablesDeducted).length === 0 ? (
              <div style={{ color: 'var(--qms-text-muted)' }}>None yet</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(consumablesDeducted).map(([t, n]) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>{t} × {n}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Final check & close</div>
        <ul className="space-y-1 text-[12.5px]">
          <li className="flex items-center gap-2" style={{ color: checkedIn ? 'var(--success)' : 'var(--danger)' }}>
            {checkedIn ? <FiCheckCircle size={13} /> : <FiAlertTriangle size={13} />} Check-in recorded
          </li>
          <li className="flex items-center gap-2" style={{ color: setupPhotoDone ? 'var(--success)' : 'var(--danger)' }}>
            {setupPhotoDone ? <FiCheckCircle size={13} /> : <FiAlertTriangle size={13} />} Setup photo captured
          </li>
          <li className="flex items-center gap-2" style={{ color: screeningResults.length > 0 ? 'var(--success)' : 'var(--danger)' }}>
            {screeningResults.length > 0 ? <FiCheckCircle size={13} /> : <FiAlertTriangle size={13} />} Patient screenings ({screeningResults.length})
          </li>
        </ul>
        <label className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: 'var(--qms-text)' }}>
          <input type="checkbox" checked={reportsUploaded} onChange={(e) => onReportsUploadedChange(e.target.checked)} disabled={!!closedAt} />
          Mark reports as uploaded
        </label>

        <div className="flex items-center justify-between rounded-lg px-3.5 py-2.5" style={{ background: statusMeta[finalCheck.status].bg }}>
          <div>
            <div className="text-[12.5px] font-bold" style={{ color: statusMeta[finalCheck.status].color }}>{statusMeta[finalCheck.status].label}</div>
            <div className="text-[11px]" style={{ color: statusMeta[finalCheck.status].color }}>{finalCheck.reason}</div>
          </div>
          {typeof delayMins === 'number' && (
            <div className="text-[11px] text-right" style={{ color: statusMeta[finalCheck.status].color }}>
              Delay: {delayMins}m{delayReason ? ` · ${delayReason}` : ''}
            </div>
          )}
        </div>

        {closedAt ? (
          <Button className="w-full" disabled>Camp closed ✓ — {new Date(closedAt).toLocaleString()}</Button>
        ) : (
          <Button className="w-full" onClick={handleCloseClick}>Close camp</Button>
        )}
      </section>

      <CameraGeoCapture
        open={captureKey !== null}
        title={DEFAULT_ADDITIONAL_PHOTOS.find((p) => p.id === captureKey)?.label ?? 'Additional photo'}
        facing="environment"
        onConfirm={handleAdditionalConfirm}
        onClose={() => setCaptureKey(null)}
      />
      <CameraGeoCapture open={closureCaptureOpen} title="Closure photo" facing="environment" onConfirm={handleClosureConfirm} onClose={() => setClosureCaptureOpen(false)} />

      <Dialog open={confirmIncompleteOpen} onOpenChange={(o) => !o && setConfirmIncompleteOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Close as incomplete?</DialogTitle></DialogHeader>
          <div className="flex items-start gap-2 text-[12.5px] rounded-lg px-3 py-2.5" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <FiAlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{finalCheck.reason}. This camp will be marked INCOMPLETE. You can still close it, but it will surface in your pending-closure queue.</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmIncompleteOpen(false)}>Go back</Button>
            <Button style={{ background: 'var(--danger)' }} onClick={() => { setConfirmIncompleteOpen(false); onCloseCamp(finalCheck) }}>Close as incomplete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ClosureStage
