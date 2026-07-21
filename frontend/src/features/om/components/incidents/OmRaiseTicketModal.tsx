import { useEffect, useState } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { Camp } from '@/types/camp.types'
import type { Person } from '@/types/people.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import type { IncidentCategory, IncidentSeverity } from '@/features/fo/fo.types'
import { INCIDENT_CATEGORIES } from '@/features/fo/fo.types'

interface OmRaiseTicketModalProps {
  open: boolean
  fos: Person[]
  camps: Camp[]
  devices: DeviceCatalogItem[]
  onClose: () => void
  onSubmit: (incident: {
    category: IncidentCategory
    campId?: string
    deviceId?: string
    title: string
    notes: string
    severity: IncidentSeverity
    foId: string
    foName: string
    city?: string
  }) => void
}

// OM-facing "Raise ticket" — mirrors incidents.js's openRaiseSos() modal
// (category / title / description / machine / camp / city), but adds an
// explicit "on behalf of FO" picker since an Operations Manager raises
// tickets for ANY field officer/camp, not just their own — the FO-scoped
// RaiseSosModal has no such field because an FO can only ever raise for
// themself. Visual language (grid form, danger-tinted notice banner,
// Dialog/Select/Textarea usage) intentionally matches RaiseSosModal.tsx.
const OmRaiseTicketModal = ({ open, fos, camps, devices, onClose, onSubmit }: OmRaiseTicketModalProps) => {
  const [category, setCategory] = useState<IncidentCategory>('sos')
  const [foId, setFoId] = useState('')
  const [campId, setCampId] = useState('__none__')
  const [deviceId, setDeviceId] = useState('__none__')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [city, setCity] = useState('')

  const activeCategory = INCIDENT_CATEGORIES.find((c) => c.value === category) ?? INCIDENT_CATEGORIES[INCIDENT_CATEGORIES.length - 1]

  useEffect(() => {
    if (!open) return
    setCategory('sos')
    setFoId(fos[0]?.id ?? '')
    setCampId('__none__')
    setDeviceId('__none__')
    setTitle('')
    setNotes('')
    setCity('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleClose = () => onClose()

  const handleSubmit = () => {
    if (!foId) return
    const fo = fos.find((f) => f.id === foId)
    if (!fo) return
    const finalTitle = title.trim() || activeCategory.label
    onSubmit({
      category,
      campId: campId === '__none__' ? undefined : campId,
      deviceId: deviceId === '__none__' ? undefined : deviceId,
      title: finalTitle,
      notes: notes.trim(),
      severity: activeCategory.defaultSeverity,
      foId: fo.id,
      foName: fo.name,
      city: city.trim() || undefined,
    })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Raise ticket · on behalf of FO</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Category *</label>
            <Select value={category} onValueChange={(v) => setCategory((v as IncidentCategory) ?? 'sos')}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INCIDENT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label} · {c.defaultSeverity} · SLA {c.slaMinutes}m</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Field Officer *</label>
            <Select value={foId} onValueChange={(v) => setFoId(v ?? '')}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select FO" /></SelectTrigger>
              <SelectContent>
                {fos.map((f) => <SelectItem key={f.id} value={f.id}>{f.name} · {f.hq}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="One-line summary" />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Description</label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What happened? Steps tried? Severity?" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Related machine (if any)</label>
            <Select value={deviceId} onValueChange={(v) => setDeviceId(v ?? '__none__')}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— (none) —</SelectItem>
                {devices.filter((d) => d.status === 'ACTIVE' || !d.status).map((d) => <SelectItem key={d.id} value={d.id}>{d.name} · {d.type ?? ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Camp / context</label>
            <Select value={campId} onValueChange={(v) => setCampId(v ?? '__none__')}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— (none) —</SelectItem>
                {camps.map((c) => <SelectItem key={c.id} value={c.id}>{c.id} · {c.city}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>City</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="flex items-start gap-2 text-[11.5px] rounded-lg px-3 py-2" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          <FiAlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            High-priority lane: SOS / Machine failure / Inventory mismatch tickets jump every sync queue and notify Coordinator + Operations Manager
            {category === 'machine_failure' ? ' · Service Engineer (for machines) immediately.' : '.'}
          </span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!foId} style={{ background: 'linear-gradient(135deg,#f43f5e,#fb7185)', color: '#fff' }}>Raise &amp; notify</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OmRaiseTicketModal
