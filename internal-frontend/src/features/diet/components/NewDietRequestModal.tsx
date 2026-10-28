import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DatePicker from '@/components/ui/DatePicker'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useClientsDataShared } from '@/hooks/useClientsDataShared'
import { SLOTS } from '@/types/camp.types'
import type { Camp } from '@/types/camp.types'

interface NewDietRequestModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (camp: Camp) => void
}

function dPlus(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
}

const MIN_DAYS = 4
const MAX_DAYS = 30

// Mirrors dcNewRequest exactly (diet-camps.js:1938-2030) — booking window is
// today+4 to today+30 days inclusive, re-validated on submit.
const NewDietRequestModal = ({ open, onClose, onConfirm }: NewDietRequestModalProps) => {
  const { clients, divisions } = useClientsDataShared()
  const [clientId, setClientId] = useState('')
  const [divisionId, setDivisionId] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState(SLOTS[0]?.id ?? '')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [patientsExpected, setPatientsExpected] = useState('40')
  const [error, setError] = useState('')

  const minDate = dPlus(MIN_DAYS)
  const maxDate = dPlus(MAX_DAYS)

  const filteredDivisions = useMemo(() => divisions.filter((d) => d.clientId === clientId), [divisions, clientId])

  const handleConfirm = () => {
    if (!clientId || !date) { setError('Client and date are required.'); return }
    const days = Math.round((new Date(date).getTime() - Date.now()) / 86400000)
    if (days < MIN_DAYS || days > MAX_DAYS) {
      setError(`Date must be between ${MIN_DAYS} and ${MAX_DAYS} days from today.`)
      return
    }
    const expected = Number(patientsExpected)
    const camp: Camp = {
      id: `DC-${Date.now().toString().slice(-6)}`,
      date, slot, type: 'Diet', status: 'REQUESTED',
      clientId, divisionId: divisionId || null, doctorId: '',
      city, state, foId: '', dietitianId: '',
      patientsExpected: isNaN(expected) ? 40 : expected, patientsDone: 0,
      devicesAllocated: ['dev-bdy'], rxCount: 0, feedback: 0, foRating: 0,
      resources: { FO: '', DIETITIAN: '', LABTECH: '', MANPOWER: [] },
      confirmations: {}, requestedAt: new Date().toISOString(),
    }
    onConfirm(camp)
    setClientId(''); setDivisionId(''); setDate(''); setCity(''); setState(''); setPatientsExpected('40'); setError('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New diet camp request</DialogTitle></DialogHeader>
        <div className="space-y-3 text-[13px]">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Client</label>
            <Select value={clientId} onValueChange={(v) => { setClientId(v ?? ''); setDivisionId('') }}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Division</label>
            <Select value={divisionId} onValueChange={(v) => setDivisionId(v ?? '')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Select division" /></SelectTrigger>
              <SelectContent>
                {filteredDivisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Date ({MIN_DAYS}-{MAX_DAYS} days out)</label>
              <DatePicker value={date} onChange={setDate} placeholder={`${minDate} to ${maxDate}`} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Slot</label>
              <Select value={slot} onValueChange={(v) => setSlot(v ?? '')}>
                <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SLOTS.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>City</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>State</label>
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Patients expected</label>
            <Input type="number" min={1} value={patientsExpected} onChange={(e) => setPatientsExpected(e.target.value)} />
          </div>
          {error && <p className="text-[12px]" style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Submit request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default NewDietRequestModal
