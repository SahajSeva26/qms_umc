import { useState } from 'react'
import type { ReactNode } from 'react'
import type { AppointmentEntity, AppointmentStatus } from '@/types/appointment.types'
import {
  APPOINTMENT_MODE_LABEL,
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_TRANSITION_MAP,
  APPOINTMENT_TYPE_LABEL,
} from '@/types/appointment.types'
import { usePermission } from '@/hooks/usePermission'
import { useMoveAppointmentStage } from '@/features/crm/appointments/hooks/useMoveAppointmentStage'
import { useRespondToAppointment } from '@/features/crm/appointments/hooks/useRespondToAppointment'
import { useUpdateAppointment } from '@/features/crm/appointments/hooks/useUpdateAppointment'
import SideDrawer from '@/components/ui/SideDrawer'
import KeyValueGrid from '@/components/ui/KeyValueGrid'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import DateTimePicker from '@/components/ui/DateTimePicker'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  planned: '#3b6dff',
  done: '#10b981',
  cancelled: '#94a3b8',
}

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

const refName = (ref: unknown, fallback = '—'): string => {
  if (!ref) return fallback
  if (typeof ref === 'string') return ref
  const obj = ref as { name?: string }
  return obj.name ?? fallback
}

// Lead's own populated shape uses `title`, not `name` (appointment.
// service.ts's populate array: `{ path: 'lead', select: 'code title status' }`)
// — a real crash found 2026-08-04: the old call site cast the raw Lead
// object itself as the fallback string (`refName(lead, lead as string)`),
// which meant refName's `obj.name` miss returned the OBJECT as "the
// fallback string," and that object got rendered directly into JSX
// (React error #31, "object with keys {_id, code, status, title}").
const leadRefName = (ref: unknown, fallback = '—'): string => {
  if (!ref) return fallback
  if (typeof ref === 'string') return ref
  const obj = ref as { title?: string }
  return obj.title ?? fallback
}

type PanelKind = 'moveStage' | 'reschedule' | null

interface AppointmentDrawerProps {
  appointment: AppointmentEntity | null
  onClose: () => void
}

// Mirrors the prototype's drawer field order (sales-calendar.js's
// renderDrawer): header pills -> title/subtitle -> meta grid -> agenda card
// -> next steps -> MOM panel -> invitee panel -> action buttons. Per the
// 2026-07-27 decision documented in PROGRESS.md: no outcome panel (dropped),
// no reschedule-history block (reschedule is a plain field update), no
// peer-overlay concept (own-scope is the real backend's own permission
// model, enforced server-side — this drawer only ever opens for an
// appointment the viewer can already see).
const AppointmentDrawer = ({ appointment, onClose }: AppointmentDrawerProps) => {
  const [panel, setPanel] = useState<PanelKind>(null)
  const [reason, setReason] = useState('')
  const [targetStatus, setTargetStatus] = useState<AppointmentStatus | ''>('')
  const [momText, setMomText] = useState('')
  const [rescheduleStart, setRescheduleStart] = useState('')
  const [rescheduleEnd, setRescheduleEnd] = useState('')
  // True once the user has directly edited End — stops the auto-shift below.
  // NOT derived by comparing rescheduleEnd against its original pre-filled
  // value on every Start change: End is already reassigned by the auto-shift
  // itself, so that comparison goes stale after the very first shift and
  // silently disables further shifts (found 2026-08-11: editing Start's date
  // and then its time, as two separate DateTimePicker fields, produced an
  // End stuck at the first shift's value instead of tracking Start).
  const [endTouched, setEndTouched] = useState(false)
  const [error, setError] = useState('')

  const { session } = usePermission()

  const moveStage = useMoveAppointmentStage(appointment?.id ?? '')
  const respond = useRespondToAppointment(appointment?.id ?? '')
  const updateAppointment = useUpdateAppointment(appointment?.id ?? '')

  if (!appointment) return null

  const myRoleId = session?.role.id
  const myInvite = appointment.internalMembers.find((m) => {
    const roleId = typeof m.role === 'string' ? m.role : m.role._id
    return roleId === myRoleId
  })

  // Falls back to [] for a status this map no longer knows about (e.g. a
  // pre-existing 'blocked'/'released' record from before that status was
  // removed 2026-08-11 — the backend hasn't dropped it yet, so one can still
  // exist) — treats it as terminal/read-only rather than crashing on
  // .length of undefined.
  const legalTargets = APPOINTMENT_TRANSITION_MAP[appointment.status] ?? []
  const isTerminal = legalTargets.length === 0
  const statusColor = STATUS_COLOR[appointment.status] ?? '#94a3b8'

  const openMoveStage = (to: AppointmentStatus) => {
    setError('')
    setReason('')
    setMomText(appointment.mom.details ?? '')
    setTargetStatus(to)
    setPanel('moveStage')
  }

  // MOM has its own endpoint (PUT /appointments/:id, not the stage-move one
  // — see UpdateAppointmentPayload/appointment.service.ts's update()), so
  // saving it alongside "Mark done" is two sequential calls, not one
  // combined payload. Saved first: if the status flip then fails (e.g. a
  // transition race), the MOM text the user just typed isn't lost.
  const handleMoveStageSave = async () => {
    if (!targetStatus) return
    if (!reason.trim()) return setError('A reason is required')
    try {
      if (targetStatus === 'done' && momText.trim() && momText.trim() !== (appointment.mom.details ?? '')) {
        await updateAppointment.mutateAsync({ mom: { details: momText.trim() } })
      }
      await moveStage.mutateAsync({ to: targetStatus, reason: reason.trim() })
      toast.success(`Moved to ${APPOINTMENT_STATUS_LABEL[targetStatus]}`)
      setPanel(null)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not update the appointment status.')
    }
  }

  const openReschedule = () => {
    setError('')
    setRescheduleStart(appointment.duration.startTime.slice(0, 16))
    setRescheduleEnd(appointment.duration.endTime?.slice(0, 16) ?? '')
    setEndTouched(false)
    setPanel('reschedule')
  }

  // Keeps the original duration when only the start time is moved — without
  // this, changing Start to later than the pre-filled (original) End
  // silently produces an invalid range the user has to notice and fix
  // themselves. Only shifts End automatically; once the user edits End
  // directly (endTouched), that value is left alone.
  const originalDurationMs = appointment.duration.endTime
    ? new Date(appointment.duration.endTime).getTime() - new Date(appointment.duration.startTime).getTime()
    : null
  const handleRescheduleStartChange = (value: string) => {
    setRescheduleStart(value)
    if (!endTouched && originalDurationMs && value) {
      const newEnd = new Date(new Date(value).getTime() + originalDurationMs)
      const pad = (n: number) => String(n).padStart(2, '0')
      setRescheduleEnd(
        `${newEnd.getFullYear()}-${pad(newEnd.getMonth() + 1)}-${pad(newEnd.getDate())}T${pad(newEnd.getHours())}:${pad(newEnd.getMinutes())}`,
      )
    }
  }

  const handleRescheduleEndChange = (value: string) => {
    setEndTouched(true)
    setRescheduleEnd(value)
  }

  const handleRescheduleSave = async () => {
    if (!rescheduleStart) return setError('A new start time is required')
    if (rescheduleEnd && new Date(rescheduleEnd).getTime() <= new Date(rescheduleStart).getTime()) {
      return setError('End must be after start')
    }
    try {
      await updateAppointment.mutateAsync({
        startTime: new Date(rescheduleStart).toISOString(),
        endTime: rescheduleEnd ? new Date(rescheduleEnd).toISOString() : undefined,
      })
      toast.success('Appointment rescheduled')
      setPanel(null)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not reschedule.')
    }
  }

  const handleRsvp = async (status: 'accepted' | 'declined') => {
    try {
      await respond.mutateAsync({ status })
      toast.success(status === 'accepted' ? 'Accepted' : 'Declined')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not record your response.')
    }
  }

  return (
    <SideDrawer open title="Appointment details" onClose={onClose}>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-[10px] font-bold px-2 py-1 rounded-full font-mono" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
          {appointment.code}
        </span>
        <Pill color="var(--qms-brand)">{APPOINTMENT_TYPE_LABEL[appointment.type]}</Pill>
        <Pill color={statusColor}>{APPOINTMENT_STATUS_LABEL[appointment.status] ?? appointment.status}</Pill>
      </div>

      <h3 className="text-[16px] font-bold" style={{ color: 'var(--qms-text)' }}>
        {refName(appointment.contactPerson)}
      </h3>
      <p className="text-[12px] mt-0.5 mb-4" style={{ color: 'var(--qms-text-muted)' }}>
        {refName(appointment.tenant)} · {refName(appointment.division)}
      </p>

      <KeyValueGrid
        columns={2}
        items={[
          { label: 'Sales person', value: refName(appointment.salesPerson) },
          {
            label: 'When',
            value: `${new Date(appointment.duration.startTime).toLocaleString()}${appointment.duration.endTime ? ` – ${new Date(appointment.duration.endTime).toLocaleTimeString()}` : ''}`,
          },
          { label: 'Mode', value: APPOINTMENT_MODE_LABEL[appointment.mode] },
          { label: 'Link', value: appointment.destinationLink || undefined },
          { label: 'Linked lead', value: appointment.lead ? leadRefName(appointment.lead) : undefined },
          { label: 'Parent appointment', value: appointment.parent ? refName(appointment.parent) : undefined },
        ]}
      />

      <div className="mt-4 space-y-2.5">
        <div>
          <SectionLabel>Agenda</SectionLabel>
          <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{appointment.agenda.public || '—'}</p>
        </div>
        {appointment.agenda.private && (
          <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(168,85,247,.08)', border: '1px solid rgba(168,85,247,.3)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#a855f7' }}>
              Private notes
            </div>
            <p className="text-[12px]" style={{ color: 'var(--qms-text)' }}>{appointment.agenda.private}</p>
          </div>
        )}
        {appointment.nextSteps && (
          <div>
            <SectionLabel>Next steps</SectionLabel>
            <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{appointment.nextSteps}</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <SectionLabel>Minutes of meeting</SectionLabel>
        {appointment.mom.details ? (
          <div className="rounded-lg border px-2.5 py-2" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
            <p className="text-[13px] whitespace-pre-wrap" style={{ color: 'var(--qms-text)' }}>{appointment.mom.details}</p>
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            Not submitted yet{appointment.mom.submissionDeadline ? ` — due by ${new Date(appointment.mom.submissionDeadline).toLocaleString()}` : ''}.
          </p>
        )}
      </div>

      {appointment.internalMembers.length > 0 && (
        <div className="mt-4">
          <SectionLabel>Internal team invitations</SectionLabel>
          <div className="space-y-1.5">
            {appointment.internalMembers.map((m, i) => {
              const roleId = typeof m.role === 'string' ? m.role : m.role._id
              const color = m.status === 'accepted' ? '#10b981' : m.status === 'declined' ? '#f43f5e' : '#f59e0b'
              return (
                <div key={roleId ?? i} className="flex items-center justify-between text-[12px] rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--qms-border)' }}>
                  <span style={{ color: 'var(--qms-text)' }}>{refName(m.role)}</span>
                  <Pill color={color}>{m.status}</Pill>
                </div>
              )
            })}
          </div>
          {myInvite && myInvite.status === 'pending' && appointment.status === 'planned' && (
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={() => handleRsvp('accepted')} disabled={respond.isPending}>Accept</Button>
              <Button size="sm" variant="outline" onClick={() => handleRsvp('declined')} disabled={respond.isPending}>Decline</Button>
            </div>
          )}
        </div>
      )}

      {!isTerminal ? (
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--qms-border)' }}>
          <div className="flex flex-wrap gap-2">
            {legalTargets.includes('done') && <Button size="sm" onClick={() => openMoveStage('done')}>Mark done</Button>}
            {appointment.status === 'planned' && <Button size="sm" variant="outline" onClick={openReschedule}>Reschedule</Button>}
            {legalTargets.includes('cancelled') && (
              <Button size="sm" variant="destructive" onClick={() => openMoveStage('cancelled')}>Cancel</Button>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-5 pt-4 text-[12px]" style={{ borderTop: '1px solid var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          This appointment is {(APPOINTMENT_STATUS_LABEL[appointment.status] ?? appointment.status).toLowerCase()} — read-only.
        </p>
      )}

      <Dialog open={panel === 'moveStage'} onOpenChange={(o) => !o && setPanel(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{targetStatus && `Move to ${APPOINTMENT_STATUS_LABEL[targetStatus]}`}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className={labelClasses} style={labelStyle}>Reason *</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="text-[13px]" />
            </div>
            {targetStatus === 'done' && (
              <div>
                <Label className={labelClasses} style={labelStyle}>Minutes of meeting</Label>
                <Textarea
                  value={momText}
                  onChange={(e) => setMomText(e.target.value)}
                  rows={3}
                  placeholder="What was discussed / decided…"
                  className="text-[13px]"
                />
              </div>
            )}
            {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPanel(null)}>Cancel</Button>
            <Button onClick={handleMoveStageSave} disabled={moveStage.isPending || updateAppointment.isPending}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={panel === 'reschedule'} onOpenChange={(o) => !o && setPanel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reschedule appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className={labelClasses} style={labelStyle}>New start *</Label>
                <DateTimePicker value={rescheduleStart} onChange={handleRescheduleStartChange} className="text-[13px] w-full" />
              </div>
              <div>
                <Label className={labelClasses} style={labelStyle}>New end</Label>
                <DateTimePicker value={rescheduleEnd} onChange={handleRescheduleEndChange} className="text-[13px] w-full" />
              </div>
            </div>
            {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPanel(null)}>Cancel</Button>
            <Button onClick={handleRescheduleSave} disabled={updateAppointment.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SideDrawer>
  )
}

export default AppointmentDrawer
