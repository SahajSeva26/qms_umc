import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { Incident } from '@/features/fo/fo.types'
import type { Person } from '@/types/people.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import { suggestReplacement } from '@/features/fo/fo.service'
import { deviceName } from './incidents.ui'

// ---------------------------------------------------------------------------
// Assign — mirrors incidents.js's inAssignTicket()/inDoAssign(): a single
// "assign to" select over the people master, no other fields.
// ---------------------------------------------------------------------------
interface AssignDialogProps {
  incident: Incident | null
  people: Person[]
  onClose: () => void
  onConfirm: (assigneeId: string, assigneeName: string) => void
}

export const AssignDialog = ({ incident, people, onClose, onConfirm }: AssignDialogProps) => {
  const [assigneeId, setAssigneeId] = useState('')

  useEffect(() => {
    if (incident) setAssigneeId(people[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident])

  if (!incident) return null

  const handleConfirm = () => {
    const p = people.find((x) => x.id === assigneeId)
    if (!p) return
    onConfirm(p.id, p.name)
  }

  return (
    <Dialog open={!!incident} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Assign ticket · {incident.id}</DialogTitle></DialogHeader>
        <div>
          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Assign to</label>
          <Select value={assigneeId} onValueChange={(v) => setAssigneeId(v ?? '')}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select person" /></SelectTrigger>
            <SelectContent>
              {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.role}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!assigneeId}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Resolve — mirrors incidents.js's inResolveTicket()/inDoResolve() (a
// resolution-notes textarea), extended per this build's spec to let the OM
// pick a replacement device via suggestReplacement() when the ticket's
// category is machine_failure — the prototype does this as a *separate*
// flow (machine-replacement.js's modal, reachable from Faulty machines /
// Camps on hold), folded in here as an optional field on the same dialog.
// ---------------------------------------------------------------------------
interface ResolveDialogProps {
  incident: Incident | null
  devices: DeviceCatalogItem[]
  onClose: () => void
  onConfirm: (notes: string, replacementDeviceId?: string, replacementNotes?: string) => void
}

export const ResolveDialog = ({ incident, devices, onClose, onConfirm }: ResolveDialogProps) => {
  const [notes, setNotes] = useState('')
  const [replacementId, setReplacementId] = useState('__none__')

  useEffect(() => {
    if (incident) {
      setNotes('')
      setReplacementId('__none__')
    }
  }, [incident])

  if (!incident) return null

  const isMachineFailure = incident.category === 'machine_failure' && !!incident.deviceId
  const suggestion = isMachineFailure ? suggestReplacement(incident.deviceId!, devices) : null
  const pickable = isMachineFailure
    ? devices.filter((d) => d.id !== incident.deviceId && d.unitsAvailable > 0 && d.status !== 'FAULTY')
    : []

  const handleConfirm = () => {
    const replacementDeviceId = replacementId === '__none__' ? undefined : replacementId
    const replacementNotes = replacementDeviceId ? `Replacement device ${deviceName(devices, replacementDeviceId)} assigned · camp released from hold` : undefined
    onConfirm(notes.trim(), replacementDeviceId, replacementNotes)
  }

  return (
    <Dialog open={!!incident} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Resolve ticket · {incident.id}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Resolution notes</label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done? Root cause? Preventive steps?" />
          </div>
          {isMachineFailure && (
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>
                Replacement device{suggestion ? ` · suggested: ${suggestion.name}` : ''}
              </label>
              <Select value={replacementId} onValueChange={(v) => setReplacementId(v ?? '__none__')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {suggestion && <SelectItem value={suggestion.id}>{suggestion.name} (suggested)</SelectItem>}
                  {pickable.filter((d) => d.id !== suggestion?.id).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                The device flag stays FAULTY until a replacement is assigned here or cleared from Faulty machines.
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Resolve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Close — mirrors incidents.js's inCloseTicket() confirm() prompt, rebuilt as
// a proper shadcn Dialog (no native confirm()) with an optional notes field.
// ---------------------------------------------------------------------------
interface CloseDialogProps {
  incident: Incident | null
  onClose: () => void
  onConfirm: (notes?: string) => void
}

export const CloseTicketDialog = ({ incident, onClose, onConfirm }: CloseDialogProps) => {
  const [notes, setNotes] = useState('')

  useEffect(() => { if (incident) setNotes('') }, [incident])

  if (!incident) return null

  return (
    <Dialog open={!!incident} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Close ticket · {incident.id}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <p className="text-[12.5px]" style={{ color: 'var(--qms-text-muted)' }}>No further changes are accepted once a ticket is closed.</p>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Closing notes (optional)" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(notes.trim() || undefined)}>Close ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Cancel — mirrors incidents.js's inCancelTicket() prompt() for a reason,
// rebuilt as a proper shadcn Dialog with a required reason field.
// ---------------------------------------------------------------------------
interface CancelDialogProps {
  incident: Incident | null
  onClose: () => void
  onConfirm: (reason: string) => void
}

export const CancelTicketDialog = ({ incident, onClose, onConfirm }: CancelDialogProps) => {
  const [reason, setReason] = useState('')

  useEffect(() => { if (incident) setReason('') }, [incident])

  if (!incident) return null

  return (
    <Dialog open={!!incident} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Cancel ticket · {incident.id}</DialogTitle></DialogHeader>
        <div>
          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Reason for cancellation *</label>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this ticket being cancelled?" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Back</Button>
          <Button style={{ background: 'var(--danger)' }} onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={!reason.trim()}>Cancel ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
