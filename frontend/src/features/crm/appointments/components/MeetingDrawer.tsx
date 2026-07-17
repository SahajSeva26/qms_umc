import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Meeting, MeetingOutcome } from '@/types/meeting.types'
import { MEETING_OUTCOME_META, MEETING_STATUS_META, MEETING_TYPE_META } from '@/types/meeting.types'
import { formatDate } from '@/utils/formatters'
import { formatTime, formatTimeRange, isMomOverdue, toLocalInputValue } from '@/features/crm/appointments/appointments.utils'
import { momSchema, releaseSchema, rescheduleSchema } from '@/features/crm/appointments/schemas'
import SideDrawer from '@/components/ui/SideDrawer'
import KeyValueGrid from '@/components/ui/KeyValueGrid'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface MeetingDrawerProps {
  meeting: Meeting | null
  canRelease: boolean
  onClose: () => void
  onSubmitMom: (id: string, momText: string, nextSteps?: string) => void
  onReschedule: (id: string, startAt: string, endAt: string, reason: string) => void
  onMarkDone: (id: string) => Promise<{ ok: boolean; error?: string }>
  onCancel: (id: string) => void
  onSetOutcome: (id: string, outcome: MeetingOutcome, reason?: string) => void
  onReleaseBlock: (id: string, reason: string) => void
}

type PanelKind = 'mom' | 'reschedule' | 'outcome' | 'cancel' | 'release' | null

const OUTCOME_OPTIONS: MeetingOutcome[] = ['CONVERTED_LEAD', 'NOT_RESPONDING', 'NOT_INTERESTED', 'WILL_UPDATE_LATER']

const labelClasses = 'block text-[10px] font-semibold tracking-widest uppercase mb-2'
const labelStyle = { color: 'var(--qms-text-muted)' }

const Pill = ({ color, children }: { color: string; children: ReactNode }) => (
  <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: `${color}22`, color }}>
    {children}
  </span>
)

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
    {children}
  </div>
)

const MeetingDrawer = ({
  meeting,
  canRelease,
  onClose,
  onSubmitMom,
  onReschedule,
  onMarkDone,
  onCancel,
  onSetOutcome,
  onReleaseBlock,
}: MeetingDrawerProps) => {
  const [panel, setPanel] = useState<PanelKind>(null)
  const [momText, setMomText] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [reason, setReason] = useState('')
  const [outcomeChoice, setOutcomeChoice] = useState<MeetingOutcome | null>(null)
  const [error, setError] = useState('')
  const [markDoneError, setMarkDoneError] = useState('')

  useEffect(() => {
    setPanel(null)
    setError('')
    setMarkDoneError('')
  }, [meeting?.id])

  if (!meeting) return null

  const typeMeta = MEETING_TYPE_META[meeting.type]
  const statusMeta = MEETING_STATUS_META[meeting.status]
  const overdue = isMomOverdue(meeting)
  const actionable = meeting.status === 'PLANNED' || meeting.status === 'BLOCKED' || meeting.status === 'RELEASED'

  const openPanel = (kind: PanelKind) => {
    setError('')
    setReason('')
    if (kind === 'mom') {
      setMomText(meeting.momText ?? '')
      setNextSteps(meeting.nextSteps ?? '')
    }
    if (kind === 'reschedule') {
      setStartAt(toLocalInputValue(meeting.startAt))
      setEndAt(toLocalInputValue(meeting.endAt))
    }
    if (kind === 'outcome') setOutcomeChoice(meeting.outcome ?? null)
    setPanel(kind)
  }

  const handleMomSave = () => {
    const result = momSchema.safeParse({ momText, nextSteps })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please review the form')
      return
    }
    onSubmitMom(meeting.id, result.data.momText, result.data.nextSteps?.trim() || undefined)
    setPanel(null)
  }

  const handleRescheduleSave = () => {
    const result = rescheduleSchema.safeParse({ startAt, endAt, reason })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please review the form')
      return
    }
    onReschedule(
      meeting.id,
      new Date(result.data.startAt).toISOString(),
      new Date(result.data.endAt).toISOString(),
      result.data.reason
    )
    setPanel(null)
  }

  const handleOutcomeSave = () => {
    if (!outcomeChoice) {
      setError('Pick an outcome')
      return
    }
    onSetOutcome(meeting.id, outcomeChoice, reason.trim() || undefined)
    setPanel(null)
  }

  const handleMarkDone = async () => {
    setMarkDoneError('')
    const result = await onMarkDone(meeting.id)
    if (!result.ok) setMarkDoneError(result.error ?? 'Could not mark this meeting done')
  }

  const handleReleaseSave = () => {
    const result = releaseSchema.safeParse({ reason })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Justification is required')
      return
    }
    onReleaseBlock(meeting.id, result.data.reason)
    setPanel(null)
  }

  return (
    <SideDrawer open title="Meeting details" onClose={onClose}>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {meeting.meetingNo && (
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}
          >
            {meeting.meetingNo}
          </span>
        )}
        <Pill color={typeMeta.color}>{typeMeta.name}</Pill>
        <Pill color={statusMeta.color}>{statusMeta.name}</Pill>
        {overdue && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-danger-soft text-danger">⚠ MOM overdue</span>}
        {meeting.outcome && (
          <Pill color={MEETING_OUTCOME_META[meeting.outcome].color}>
            {MEETING_OUTCOME_META[meeting.outcome].name}
          </Pill>
        )}
      </div>

      <h3 className="text-[16px] font-bold" style={{ color: 'var(--qms-text)' }}>
        {meeting.pharmaName} · {meeting.contactName}
      </h3>
      <p className="text-[12px] mt-0.5 mb-4" style={{ color: 'var(--qms-text-muted)' }}>
        {[meeting.contactRole, meeting.city].filter(Boolean).join(' · ') || '—'}
      </p>

      <KeyValueGrid
        columns={2}
        items={[
          { label: 'Owner', value: meeting.ownerName },
          { label: 'When', value: `${formatDate(meeting.startAt)} · ${formatTimeRange(meeting.startAt, meeting.endAt)}` },
          { label: 'Location', value: meeting.location },
          { label: 'Linked lead', value: meeting.linkedLeadId },
          {
            label: 'Mode',
            value: meeting.modeOfMeeting ? (meeting.modeOfMeeting === 'VIRTUAL' ? 'Virtual' : 'In person') : undefined,
          },
          { label: 'Division', value: meeting.divisionName },
        ]}
      />

      {meeting.rescheduleHistory && meeting.rescheduleHistory.length > 0 && (
        <div className="mt-4">
          <SectionLabel>Reschedule history</SectionLabel>
          <div className="space-y-1.5">
            {meeting.rescheduleHistory.map((r, i) => (
              <div
                key={i}
                className="text-[11px] rounded-lg border px-2.5 py-2"
                style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
              >
                <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>
                  {formatDate(r.from.startAt)} {formatTime(r.from.startAt)} → {formatDate(r.to.startAt)} {formatTime(r.to.startAt)}
                </div>
                <div className="mt-0.5">{r.reason} · {formatDate(r.at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        <div>
          <SectionLabel>Agenda</SectionLabel>
          <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{meeting.agendaPublic}</p>
        </div>
        {meeting.agendaPrivate && (
          <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(168,85,247,.08)', border: '1px solid rgba(168,85,247,.3)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: MEETING_TYPE_META.SPOT.color }}>
              Private agenda
            </div>
            <p className="text-[12px]" style={{ color: 'var(--qms-text)' }}>{meeting.agendaPrivate}</p>
          </div>
        )}
        {meeting.nextSteps && (
          <div>
            <SectionLabel>Next steps</SectionLabel>
            <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{meeting.nextSteps}</p>
          </div>
        )}
      </div>

      {meeting.status === 'BLOCKED' && (
        <div className="mt-4 rounded-lg px-2.5 py-2 bg-danger-soft">
          <div className="text-[11px] font-bold text-danger">
            Blocked{meeting.blockedAt ? ` · ${formatDate(meeting.blockedAt)}` : ''}
          </div>
          {meeting.blockReason && <p className="text-[12px] text-danger">{meeting.blockReason}</p>}
          <p className="text-[11px] mt-1 text-danger opacity-80">
            Submitting the MOM alone never un-blocks a meeting — a Sales Lead or Admin must release it explicitly.
          </p>
        </div>
      )}

      {meeting.status === 'RELEASED' && (
        <div className="mt-4 rounded-lg px-2.5 py-2" style={{ background: 'rgba(168,85,247,.08)', border: '1px solid rgba(168,85,247,.3)' }}>
          <div className="text-[11px] font-bold" style={{ color: MEETING_STATUS_META.RELEASED.color }}>
            Block released by {meeting.releasedBy ?? '—'}
            {meeting.releasedAt ? ` · ${formatDate(meeting.releasedAt)}` : ''}
          </div>
          {meeting.releaseReason && <p className="text-[12px]" style={{ color: 'var(--qms-text)' }}>{meeting.releaseReason}</p>}
          {meeting.blockReason && (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
              Originally blocked: {meeting.blockReason}
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        <SectionLabel>Minutes of meeting</SectionLabel>
        {meeting.momText ? (
          <div className="rounded-lg border px-2.5 py-2" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
            <p className="text-[13px] whitespace-pre-wrap" style={{ color: 'var(--qms-text)' }}>{meeting.momText}</p>
            {meeting.momSubmittedAt && (
              <div className="text-[10px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                Submitted {formatDate(meeting.momSubmittedAt)} · {formatTime(meeting.momSubmittedAt)}
              </div>
            )}
          </div>
        ) : overdue ? (
          <div className="rounded-lg px-2.5 py-2 bg-warning-soft">
            <p className="text-[12px] font-semibold text-warning">
              ⚠ MOM overdue — it was due within 24 working hours of the meeting end.
            </p>
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Not submitted yet.</p>
        )}
      </div>

      {actionable ? (
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--qms-border)' }}>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => openPanel('mom')}>Complete with MOM</Button>
            <Button size="sm" variant="outline" onClick={() => openPanel('reschedule')}>Reschedule</Button>
            <Button size="sm" variant="outline" onClick={() => openPanel('outcome')}>Set outcome</Button>
            <Button size="sm" variant="secondary" onClick={handleMarkDone}>Mark done</Button>
            <Button size="sm" variant="destructive" onClick={() => openPanel('cancel')}>Cancel</Button>
            {canRelease && meeting.status === 'BLOCKED' && (
              <Button size="sm" variant="outline" onClick={() => openPanel('release')}>Release block</Button>
            )}
          </div>
          {markDoneError && <p className="text-[12px] mt-2 font-semibold text-danger">{markDoneError}</p>}
        </div>
      ) : (
        <p className="mt-5 pt-4 text-[12px]" style={{ borderTop: '1px solid var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          This meeting is {statusMeta.name.toLowerCase()} — read-only.
        </p>
      )}

      {/* Complete with MOM */}
      <Dialog open={panel === 'mom'} onOpenChange={(o) => !o && setPanel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Complete with MOM</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>MOM notes *</Label>
              <Textarea
                value={momText}
                onChange={(e) => setMomText(e.target.value)}
                rows={4}
                className="text-[13px]"
                placeholder="What was discussed, decisions, commitments..."
              />
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Next steps</Label>
              <Textarea
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                rows={2}
                className="text-[13px]"
                placeholder="Optional follow-up actions"
              />
            </div>
            {meeting.status === 'BLOCKED' && (
              <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                This meeting is blocked — submitting the MOM records it but does not un-block. Ask a Sales Lead/Admin to release.
              </p>
            )}
            {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPanel(null)}>Cancel</Button>
            <Button onClick={handleMomSave}>Submit MOM</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule */}
      <Dialog open={panel === 'reschedule'} onOpenChange={(o) => !o && setPanel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reschedule meeting</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClasses} style={labelStyle}>New start *</Label>
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="text-[13px]" />
              </div>
              <div>
                <Label className={labelClasses} style={labelStyle}>New end *</Label>
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="text-[13px]" />
              </div>
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Reason *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="text-[13px]"
                placeholder="Why is this moving?"
              />
            </div>
            {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPanel(null)}>Cancel</Button>
            <Button onClick={handleRescheduleSave}>Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set outcome */}
      <Dialog open={panel === 'outcome'} onOpenChange={(o) => !o && setPanel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Set outcome</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {OUTCOME_OPTIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOutcomeChoice(o)}
                  className="rounded-xl border px-3 py-2.5 text-left transition-colors"
                  style={
                    outcomeChoice === o
                      ? { borderColor: 'var(--qms-brand)', background: 'rgba(59,109,255,.08)' }
                      : { borderColor: 'var(--qms-border)' }
                  }
                >
                  <div className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>
                    {MEETING_OUTCOME_META[o].name}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                    {MEETING_OUTCOME_META[o].hint}
                  </div>
                </button>
              ))}
            </div>
            <div>
              <Label className={labelClasses} style={labelStyle}>Reason (optional)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="text-[13px]" />
            </div>
            <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
              Saving an outcome marks the meeting as done.
            </p>
            {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPanel(null)}>Cancel</Button>
            <Button onClick={handleOutcomeSave}>Save outcome</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <Dialog open={panel === 'cancel'} onOpenChange={(o) => !o && setPanel(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Cancel meeting</DialogTitle></DialogHeader>
          <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
            Cancel {meeting.meetingNo ?? 'this meeting'} with {meeting.pharmaName}? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPanel(null)}>Keep meeting</Button>
            <Button
              variant="destructive"
              onClick={() => {
                onCancel(meeting.id)
                setPanel(null)
              }}
            >
              Cancel meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release block */}
      <Dialog open={panel === 'release'} onOpenChange={(o) => !o && setPanel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Release block</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
              Releasing lets the owner act on this meeting again. A justification is required and kept on record.
            </p>
            <div>
              <Label className={labelClasses} style={labelStyle}>Justification *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="text-[13px]"
                placeholder="Why is this block being released?"
              />
            </div>
            {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPanel(null)}>Cancel</Button>
            <Button onClick={handleReleaseSave}>Release block</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SideDrawer>
  )
}

export default MeetingDrawer
