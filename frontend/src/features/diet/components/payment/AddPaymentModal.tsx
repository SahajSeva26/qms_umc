import { useEffect, useMemo, useState } from 'react'
import { FiCheck } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import type { Camp } from '@/types/camp.types'
import type { DietPayment } from '@/features/diet/dietitians.types'
import { dietitianExpense, campPaymentStatus, addDietPayment, fmtInr } from '@/features/diet/dietitians.service'

interface AddPaymentModalProps {
  dietitianId: string | null
  dietitianName: string
  camps: Camp[]
  paidBy: string
  onClose: () => void
  onSaved: () => void
}

const MODES: DietPayment['mode'][] = ['BANK', 'UPI', 'CHEQUE', 'CASH']

// Add Payment modal — §2 of the build spec. Eligible camps = READY only.
// Amount auto-totals from ticked camps but stays user-editable. Since there's
// no real QMS_PAYDOCS document-upload subsystem in this codebase, this is
// simplified to two plain required file inputs (Excel sheet + photos) —
// existence-checked only, not content-validated. Disclosed simplification.
const AddPaymentModal = ({ dietitianId, dietitianName, camps, paidBy, onClose, onSaved }: AddPaymentModalProps) => {
  const eligibleCamps = useMemo(() => {
    if (!dietitianId) return []
    return camps.filter((c) => c.type === 'Diet' && c.dietitianId === dietitianId && campPaymentStatus(c) === 'READY')
  }, [camps, dietitianId])

  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [amount, setAmount] = useState(0)
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10))
  const [mode, setMode] = useState<DietPayment['mode']>('BANK')
  const [ref, setRef] = useState('')
  const [notes, setNotes] = useState('')
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [photosFile, setPhotosFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const expenseFor = (c: Camp) => dietitianExpense(c)

  useEffect(() => {
    if (!dietitianId) return
    const initChecked: Record<string, boolean> = {}
    let total = 0
    eligibleCamps.forEach((c) => {
      initChecked[c.id] = true
      total += expenseFor(c).total
    })
    setChecked(initChecked)
    setAmount(total)
    setPaidOn(new Date().toISOString().slice(0, 10))
    setMode('BANK')
    setRef('')
    setNotes('')
    setExcelFile(null)
    setPhotosFile(null)
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dietitianId])

  const toggleCamp = (campId: string) => {
    setChecked((prev) => {
      const next = { ...prev, [campId]: !prev[campId] }
      const total = eligibleCamps.filter((c) => next[c.id]).reduce((s, c) => s + expenseFor(c).total, 0)
      setAmount(total)
      return next
    })
  }

  const handleSubmit = async () => {
    const campIds = eligibleCamps.filter((c) => checked[c.id]).map((c) => c.id)
    if (!campIds.length) return setError('Tick at least one camp')
    if (!(amount > 0)) return setError('Amount must be > 0')
    if (!excelFile && !photosFile) return setError('Attach required documents: Excel + photos')
    if (!excelFile) return setError('Attach required documents: Excel sheet')
    if (!photosFile) return setError('Attach required documents: photos')

    await addDietPayment({
      dietitianId: dietitianId as string,
      dietitianName,
      amount,
      campIds,
      paidOn,
      mode,
      ref,
      notes,
      paidBy,
      // Filenames only — these are existence-checked, not content-validated
      // (disclosed simplification of the prototype's QMS_PAYDOCS subsystem),
      // but the record should still note what was attached rather than
      // discarding the file references entirely.
      documents: { excel: excelFile?.name, photos: photosFile ? [photosFile.name] : [] },
    })
    toast.success(`Payment recorded · ${fmtInr(amount)} to ${dietitianName}`)
    onSaved()
  }

  return (
    <Dialog open={!!dietitianId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record payment · {dietitianName}</DialogTitle>
        </DialogHeader>
        <p className="text-[12px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>Tick the camps you're paying for. Amount auto-totals.</p>

        {eligibleCamps.length === 0 ? (
          <div className="rounded-xl border p-4 text-[12.5px] text-center" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
            No camps READY for payment. Camps move to READY once patient count + photos are uploaded.
          </div>
        ) : (
          <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--qms-border)' }}>
            {eligibleCamps.map((c) => {
              const e = expenseFor(c)
              return (
                <label key={c.id} className="flex items-start gap-2.5 p-2.5 cursor-pointer" style={{ borderColor: 'var(--qms-border)' }}>
                  <input type="checkbox" className="mt-1" checked={!!checked[c.id]} onChange={() => toggleCamp(c.id)} />
                  <div>
                    <div className="text-[12.5px] font-bold" style={{ color: 'var(--qms-text)' }}>{c.id} · {c.city || '—'} · {c.date}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                      Base {fmtInr(e.base)} + TA {fmtInr(e.ta)} + Printing {fmtInr(e.printing)} = {fmtInr(e.total)}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Payment date</label>
            <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Mode</label>
            <Select value={mode} onValueChange={(v) => setMode(v as DietPayment['mode'])}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Bank ref / UTR (optional)</label>
            <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UTR / cheque no." />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Total amount ₹</label>
            <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
          </div>
        </div>

        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Notes (optional)</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Attach Excel sheet *</label>
            <input type="file" accept=".xls,.xlsx,.csv" className="text-[11px]" onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Attach photos *</label>
            <input type="file" accept="image/*" multiple className="text-[11px]" onChange={(e) => setPhotosFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        {error && <p className="text-[12px] font-semibold" style={{ color: '#b91c1c' }}>{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}><FiCheck size={13} /> Record payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddPaymentModal
