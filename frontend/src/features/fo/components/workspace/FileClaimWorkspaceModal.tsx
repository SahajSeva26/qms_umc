import { useMemo, useState } from 'react'
import type { Camp } from '@/types/camp.types'
import type { ClaimType } from '@/features/fo/fo.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'

interface FileClaimWorkspaceModalProps {
  open: boolean
  onClose: () => void
  camps: Camp[]
  onSubmit: (claim: { date: string; type: ClaimType; amount: number; gst: number; vendor: string; campId?: string; notes?: string; billUrl: string }) => void
}

const CLAIM_TYPES: ClaimType[] = ['TA', 'DA', 'Misc']

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

// Camps eligible to file a claim against — already happened, and within the
// 15-day claim window (later ones can still be picked but trigger the late
// warning at submit time per the spec).
const FileClaimWorkspaceModal = ({ open, onClose, camps, onSubmit }: FileClaimWorkspaceModalProps) => {
  const todayIso = new Date().toISOString().slice(0, 10)

  const eligibleCamps = useMemo(
    () => camps.filter((c) => (c.date?.slice(0, 10) ?? '') <= todayIso && daysSince(c.date) <= 15),
    [camps, todayIso]
  )

  const [campId, setCampId] = useState('')
  const [date, setDate] = useState(todayIso)
  const [type, setType] = useState<ClaimType>('TA')
  const [amount, setAmount] = useState('500')
  const [gst, setGst] = useState('0')
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')
  const [billName, setBillName] = useState('')

  const reset = () => {
    setCampId('')
    setDate(todayIso)
    setType('TA')
    setAmount('500')
    setGst('0')
    setVendor('')
    setNotes('')
    setBillName('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = () => {
    if (!campId) { toast.error('Select a camp to file this claim against'); return }
    const camp = camps.find((c) => c.id === campId)
    if (!camp) return
    const amt = Number(amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid claim amount'); return }
    if (!vendor.trim()) { toast.error('Vendor name is required'); return }
    if (!billName) { toast.error('Bill upload is mandatory — attach a PDF or photo'); return }

    const days = daysSince(camp.date)
    if (days > 30) { toast.error('Beyond 30-day cutoff — this claim can no longer be filed'); return }
    if (days > 15) toast.info('Late submission — flagged for manager exception review')

    onSubmit({
      date,
      type,
      amount: amt,
      gst: Number(gst) || 0,
      vendor: vendor.trim(),
      campId,
      notes: notes.trim() || undefined,
      billUrl: billName,
    })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>File claim</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Camp *</label>
            <Select value={campId} onValueChange={(v) => setCampId(v ?? '')}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select camp" /></SelectTrigger>
              <SelectContent>
                {eligibleCamps.map((c) => <SelectItem key={c.id} value={c.id}>{c.id} · {c.city} · {c.date?.slice(0, 10)}</SelectItem>)}
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
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Amount ₹ *</label>
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>GST %</label>
            <Input type="number" min={0} value={gst} onChange={(e) => setGst(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Vendor *</label>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor name" />
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
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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

export default FileClaimWorkspaceModal
