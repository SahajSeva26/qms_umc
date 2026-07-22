import { useState } from 'react'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { ClaimType } from '@/features/fo/fo.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'

interface FileClaimModalProps {
  open: boolean
  onClose: () => void
  fos: Person[]
  camps: Camp[]
  defaultFoId?: string
  onSubmit: (claim: { foId: string; foName: string; date: string; type: ClaimType; amount: number; campId?: string; notes?: string }) => void
}

const CLAIM_TYPES: ClaimType[] = ['TA', 'DA', 'Other']

const FileClaimModal = ({ open, onClose, fos, camps, defaultFoId, onSubmit }: FileClaimModalProps) => {
  const [foId, setFoId] = useState(defaultFoId ?? fos[0]?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState<ClaimType>('TA')
  const [amount, setAmount] = useState('500')
  const [campId, setCampId] = useState('__none__')
  const [notes, setNotes] = useState('')
  const [billName, setBillName] = useState('')

  const reset = () => {
    setFoId(defaultFoId ?? fos[0]?.id ?? '')
    setDate(new Date().toISOString().slice(0, 10))
    setType('TA')
    setAmount('500')
    setCampId('__none__')
    setNotes('')
    setBillName('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = () => {
    if (!billName) {
      toast.error('Bill image is mandatory')
      return
    }
    const fo = fos.find((f) => f.id === foId)
    if (!fo) return
    onSubmit({
      foId: fo.id,
      foName: fo.name,
      date,
      type,
      amount: Number(amount) || 0,
      campId: campId === '__none__' ? undefined : campId,
      notes: notes.trim() || undefined,
    })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>File TA/DA claim</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Field Officer</label>
            <Select value={foId} onValueChange={(v) => setFoId(v ?? '')} disabled={fos.length <= 1}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fos.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Type</label>
            <Select value={type} onValueChange={(v) => setType(v as ClaimType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLAIM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Amount ₹</label>
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Linked camp</label>
            <Select value={campId} onValueChange={(v) => setCampId(v ?? '__none__')}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {camps.slice(0, 30).map((c) => <SelectItem key={c.id} value={c.id}>{c.id} · {c.city}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Bill / photo *</label>
            <input
              type="file"
              accept="image/*,.pdf"
              className="block w-full text-[12px]"
              onChange={(e) => setBillName(e.target.files?.[0]?.name ?? '')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>File claim</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default FileClaimModal
