import { useEffect, useState } from 'react'
import { FiSave, FiPlus, FiTrash2 } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { validateBankAccount } from '@/features/diet/schemas/dietitianBank.schemas'
import type { DietitianRosterEntry, DietitianBankAccount } from '@/features/diet/dietitians.types'
import { dietitianDetails } from '@/features/diet/services/dietitianRoster.service'
import { storeChequeImage } from '@/features/diet/services/dietitianDocuments.service'
import { useUpdateDietitianDetails } from '@/features/diet/hooks/useDietitianRoster'
import { errorMessage } from '@/features/diet/utils/errorMessage'
interface DietitianBankModalProps {
  open: boolean
  onClose: () => void
  dietitian: DietitianRosterEntry | null
  onDone?: () => void
}

const blankAccount = (name: string): DietitianBankAccount => ({
  label: '', accountName: name, accountNumber: '', ifsc: '', branch: '', accountType: 'SAVINGS', upi: '', chequeUrl: '',
})

function isComplete(a: DietitianBankAccount): boolean {
  return !!(a.accountNumber && a.ifsc && a.chequeUrl)
}

function isBlank(a: DietitianBankAccount): boolean {
  return !a.label && !a.accountNumber && !a.ifsc && !a.branch && !a.upi && !a.chequeUrl
}

const DietitianBankModal = ({ open, onClose, dietitian, onDone }: DietitianBankModalProps) => {
  const [printingCharge, setPrintingCharge] = useState('150')
  const [accounts, setAccounts] = useState<DietitianBankAccount[]>([])
  const [error, setError] = useState('')
  const updateDetails = useUpdateDietitianDetails()

  useEffect(() => {
    if (!open || !dietitian) return
    const det = dietitianDetails(dietitian.id)
    setPrintingCharge(String(det.printingChargePerCamp ?? 150))
    setAccounts(det.bankAccounts.length ? det.bankAccounts.map((a) => ({ ...a })) : [blankAccount(dietitian.name)])
    setError('')
  }, [open, dietitian])

  if (!dietitian) return null

  const updateAccount = (i: number, patch: Partial<DietitianBankAccount>) => {
    setAccounts((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)))
  }

  const addAccount = () => setAccounts((prev) => [...prev, blankAccount(dietitian.name)])

  const removeAccount = (i: number) => {
    if (!window.confirm('Remove this bank account?')) return
    setAccounts((prev) => prev.filter((_, idx) => idx !== i))
  }

  // Persistence (compression, size limits, where the bytes end up) belongs to
  // the documents service — this component only holds the returned reference.
  const handleFile = async (i: number, file: File | null) => {
    if (!file) return
    setError('')
    try {
      updateAccount(i, { chequeUrl: await storeChequeImage(file) })
    } catch (err) {
      setError(errorMessage(err, 'Could not attach that file — try another.'))
    }
  }

  const handleSave = async () => {
    setError('')
    const toValidate = accounts.filter((a) => !isBlank(a))
    const finalAccounts: typeof toValidate = []
    for (let i = 0; i < toValidate.length; i++) {
      const a = toValidate[i]
      const result = validateBankAccount(a, `Account ${i + 1}`)
      if (!result.ok) { setError(result.error); return }
      finalAccounts.push({ ...a, accountNumber: result.value.accountNumber, ifsc: result.value.ifsc })
    }
    try {
      await updateDetails.mutateAsync({ id: dietitian.id, patch: { bankAccounts: finalAccounts, printingChargePerCamp: Math.max(0, Number(printingCharge) || 0) } })
    } catch (err) {
      setError(errorMessage(err, 'Could not save the bank details — try again.'))
      return
    }
    toast.success(`Bank details saved · ${dietitian.name}`)
    onClose()
    onDone?.()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bank · printing · {dietitian.name}</DialogTitle>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Multiple bank accounts + cancelled cheques + per-camp printing charge</p>
        </DialogHeader>

        <div className="mb-3">
          <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Printing charge per camp ₹</label>
          <Input type="number" step={10} min={0} value={printingCharge} onChange={(e) => setPrintingCharge(e.target.value)} className="max-w-[160px]" />
          <p className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Added to every camp's remuneration (counsellor leaflets, BMI sheets, ID stickers etc.).</p>
        </div>

        <div className="space-y-3">
          {accounts.map((a, i) => (
            <div key={i} className="rounded-lg border p-3" style={{ borderColor: 'var(--qms-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                  style={isComplete(a) ? { background: 'rgba(16,185,129,.16)', color: '#047857' } : { background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}
                >
                  {isComplete(a) ? 'COMPLETE' : 'INCOMPLETE'}
                </span>
                <button onClick={() => removeAccount(i)} className="text-[11.5px] font-semibold flex items-center gap-1" style={{ color: '#b91c1c' }}>
                  <FiTrash2 size={12} /> Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12.5px]">
                <FieldText label="Label" value={a.label} onChange={(v) => updateAccount(i, { label: v })} placeholder="Primary" />
                <FieldText label="Account holder name" value={a.accountName || ''} onChange={(v) => updateAccount(i, { accountName: v })} />
                <FieldText label="Account number" value={a.accountNumber || ''} onChange={(v) => updateAccount(i, { accountNumber: v })} />
                <FieldText label="IFSC" value={a.ifsc || ''} onChange={(v) => updateAccount(i, { ifsc: v })} />
                <FieldText label="Bank · branch" value={a.branch || ''} onChange={(v) => updateAccount(i, { branch: v })} />
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Type</label>
                  <Select value={a.accountType || 'SAVINGS'} onValueChange={(v) => updateAccount(i, { accountType: (v as 'SAVINGS' | 'CURRENT') ?? 'SAVINGS' })}>
                    <SelectTrigger className="w-full text-[12.5px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAVINGS">SAVINGS</SelectItem>
                      <SelectItem value="CURRENT">CURRENT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FieldText label="UPI ID (optional)" value={a.upi || ''} onChange={(v) => updateAccount(i, { upi: v })} />
                <div>
                  <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Cancelled cheque</label>
                  <input
                    type="file" accept="image/*,application/pdf"
                    onChange={(e) => handleFile(i, e.target.files?.[0] || null)}
                    className="text-[11.5px] w-full"
                  />
                  {a.chequeUrl && <div className="text-[10.5px] mt-0.5" style={{ color: '#047857' }}>File attached ✓</div>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addAccount} className="flex items-center gap-1 text-[12px] font-semibold mt-2" style={{ color: 'var(--qms-brand)' }}>
          <FiPlus size={12} /> Add another bank
        </button>

        <p className="text-[10.5px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>
          Cheque images are held locally in this portal. In production they go to encrypted storage and the link is audit-logged.
        </p>

        {error && <p className="text-[12px] mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}><FiSave size={13} /> Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldText({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

export default DietitianBankModal
