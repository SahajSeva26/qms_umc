import { useEffect, useState } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import type { IncidentCategory, IncidentSeverity } from '@/features/fo/fo.types'
import { INCIDENT_CATEGORIES } from '@/features/fo/fo.types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'

interface RaiseSosModalProps {
  open: boolean
  me: Person
  camps: Camp[]
  devices: DeviceCatalogItem[]
  defaultCategory?: IncidentCategory
  defaultDeviceId?: string
  onClose: () => void
  onSubmit: (incident: { category: IncidentCategory; campId?: string; deviceId?: string; title: string; notes: string; severity: IncidentSeverity }) => void
}

// Category list — derived from the same real, prototype-transcribed
// INCIDENT_CATEGORIES table the OM-side raise flow uses (incidents.js's
// openRaiseSos() lists every INC.CATEGORIES entry, not a hand-picked
// subset) — this used to hardcode only 6 of the 7 real categories
// (missing 'inventory_mismatch') with its own duplicated, drifted
// severity mapping; now single-sourced so it can't drift again.
const CATEGORY_OPTIONS: { value: IncidentCategory; label: string }[] = INCIDENT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))

function severityFor(category: IncidentCategory): IncidentSeverity {
  return INCIDENT_CATEGORIES.find((c) => c.value === category)?.defaultSeverity ?? 'LOW'
}

const RaiseSosModal = ({ open, me, camps, devices, defaultCategory, defaultDeviceId, onClose, onSubmit }: RaiseSosModalProps) => {
  const todayIso = new Date().toISOString().slice(0, 10)
  const orderedCamps = [...camps].sort((a, b) => {
    const aToday = a.date?.slice(0, 10) === todayIso
    const bToday = b.date?.slice(0, 10) === todayIso
    if (aToday && !bToday) return -1
    if (!aToday && bToday) return 1
    return (a.date < b.date ? 1 : -1)
  })

  const [category, setCategory] = useState<IncidentCategory>(defaultCategory ?? 'sos')
  const [campId, setCampId] = useState(orderedCamps[0]?.id ?? '')
  const [deviceId, setDeviceId] = useState(defaultDeviceId ?? '__none__')
  const [notes, setNotes] = useState('')
  const [photoName, setPhotoName] = useState('')

  useEffect(() => {
    if (!open) return
    setCategory(defaultCategory ?? 'sos')
    setDeviceId(defaultDeviceId ?? '__none__')
    setCampId(orderedCamps[0]?.id ?? '')
    setNotes('')
    setPhotoName('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCategory, defaultDeviceId])

  const myDevices = (me.machinesAssigned ?? []).map((id) => devices.find((d) => d.id === id) ?? { id, name: id, category: '—', unitsAvailable: 0 })

  const handleClose = () => onClose()

  const handleSubmit = () => {
    if (!campId) { toast.error('Select the affected camp'); return }
    if (!notes.trim()) { toast.error('Description is required'); return }
    const categoryLabel = CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category
    onSubmit({
      category,
      campId,
      deviceId: deviceId === '__none__' ? undefined : deviceId,
      title: categoryLabel,
      notes: notes.trim(),
      severity: severityFor(category),
    })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Raise SOS / ticket</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Category</label>
            <Select value={category} onValueChange={(v) => setCategory((v as IncidentCategory) ?? 'sos')}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Affected camp *</label>
            <Select value={campId} onValueChange={(v) => setCampId(v ?? '')}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select camp" /></SelectTrigger>
              <SelectContent>
                {orderedCamps.map((c) => <SelectItem key={c.id} value={c.id}>{c.id} · {c.city}{c.date?.slice(0, 10) === todayIso ? ' · Today' : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Affected machine</label>
            <Select value={deviceId} onValueChange={(v) => setDeviceId(v ?? '__none__')}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {myDevices.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Description *</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Photo (optional)</label>
            <input type="file" accept="image/*" className="block w-full text-[12px]" onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? '')} />
            {photoName && <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Attached: {photoName}</div>}
          </div>
        </div>
        <div className="flex items-start gap-2 text-[11.5px] rounded-lg px-3 py-2" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          <FiAlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>The Operations Manager and on-call support are notified immediately on submission — critical/SOS tickets escalate to a phone call.</span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} style={{ background: 'var(--danger)' }}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RaiseSosModal
