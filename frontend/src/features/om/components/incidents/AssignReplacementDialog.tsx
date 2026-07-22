import { useEffect, useState } from 'react'
import { FiCheck, FiZap } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { DeviceCatalogItem } from '@/types/device.types'
import { suggestReplacement } from '@/features/fo/fo.service'

interface AssignReplacementDialogProps {
  /** The faulty device id being replaced, or null when closed. */
  faultyDeviceId: string | null
  campId?: string
  devices: DeviceCatalogItem[]
  onClose: () => void
  onConfirm: (replacementDeviceId: string) => void
}

// Reachable from both "Faulty machines" and "Camps on hold" — mirrors
// machine-replacement.js's QMS_openReplacementSuggestion(): shows the
// suggestReplacement() top pick plus other same-type candidates, lets the OM
// pick one and "Assign & release hold". Simplified from the prototype's
// richer 7-day-calendar/FO-distance card grid (that data isn't modeled in
// this codebase's DeviceCatalogItem) down to a picker, which is the part of
// that flow this build's action set (resolveIncident's replacementDeviceId)
// actually needs.
const AssignReplacementDialog = ({ faultyDeviceId, campId, devices, onClose, onConfirm }: AssignReplacementDialogProps) => {
  const [pickedId, setPickedId] = useState('')

  const suggestion = faultyDeviceId ? suggestReplacement(faultyDeviceId, devices) : null
  const faulty = faultyDeviceId ? devices.find((d) => d.id === faultyDeviceId) : null
  const candidates = faultyDeviceId
    ? devices.filter((d) => d.id !== faultyDeviceId && d.unitsAvailable > 0 && d.status !== 'FAULTY' && (d.category === faulty?.category || d.type === faulty?.type))
    : []

  useEffect(() => {
    if (faultyDeviceId) setPickedId(suggestion?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faultyDeviceId])

  if (!faultyDeviceId) return null

  return (
    <Dialog open={!!faultyDeviceId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Replacement for · {faulty?.name ?? faultyDeviceId}</DialogTitle>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            Faulty machine flagged by an incident{campId ? ` · camp ${campId}` : ''} · pick a replacement to release the hold.
          </p>
        </DialogHeader>

        <div className="flex items-start gap-2 text-[11.5px] rounded-lg px-3 py-2" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          Future camps using <b>{faulty?.name ?? faultyDeviceId}</b> stay ON HOLD until a replacement is assigned.
        </div>

        <div>
          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>
            Replacement device{suggestion ? ` · suggested: ${suggestion.name}` : ''}
          </label>
          <Select value={pickedId} onValueChange={(v) => setPickedId(v ?? '')}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select a device" /></SelectTrigger>
            <SelectContent>
              {suggestion && <SelectItem value={suggestion.id}><FiZap size={12} className="inline mr-1" />{suggestion.name} (suggested)</SelectItem>}
              {candidates.filter((d) => d.id !== suggestion?.id).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {candidates.length === 0 && (
            <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>No same-type device available — escalate to procurement.</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => pickedId && onConfirm(pickedId)} disabled={!pickedId}>
            <FiCheck size={13} /> Assign &amp; release hold
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AssignReplacementDialog
