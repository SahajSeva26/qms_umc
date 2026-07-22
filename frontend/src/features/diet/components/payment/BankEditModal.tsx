import { useEffect, useState } from 'react'
import { FiPlus, FiTrash2, FiCheck, FiShield } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import type { DietitianBankAccount } from '@/features/diet/dietitians.types'
import { dietitianDetails, updateDietitianDetails } from '@/features/diet/dietitians.service'

interface BankEditModalProps {
  dietitianId: string | null
  dietitianName: string
  onClose: () => void
  onSaved: () => void
}

const emptyAccount = (n: number): DietitianBankAccount => ({
  label: `Account ${n}`, accountName: '', accountNumber: '', ifsc: '', branch: '', accountType: 'SAVINGS', upi: '', chequeUrl: '',
})

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })

// Compact bank-edit affordance — NOT part of the ground-truth prototype for
// THIS screen (that lives on a sibling screen); added here only because
// "Missing bank" is a KPI/column with no other way to act on it. Reuses the
// validation rules from features/om/components/tabs/DietitianPaymentsTab.tsx's
// bank modal (accountNumber /^\d{6,18}$/, ifsc /^[A-Z]{4}0[A-Z0-9]{6}$/,
// chequeUrl mandatory) but kept intentionally lighter (no printing-charge
// field here — that's edited nowhere on this screen either, left as-is).
const BankEditModal = ({ dietitianId, dietitianName, onClose, onSaved }: BankEditModalProps) => {
  const [accounts, setAccounts] = useState<DietitianBankAccount[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!dietitianId) return
    const existing = dietitianDetails(dietitianId)
    setAccounts(existing.bankAccounts.length ? existing.bankAccounts.map((a) => ({ ...a })) : [])
    setError('')
  }, [dietitianId])

  const addAccount = () => setAccounts((prev) => [...prev, emptyAccount(prev.length + 1)])
  const removeAccount = (i: number) => setAccounts((prev) => prev.filter((_, idx) => idx !== i))
  const updateAccount = (i: number, patch: Partial<DietitianBankAccount>) =>
    setAccounts((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)))

  const handleChequeUpload = async (i: number, file: File | undefined) => {
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    updateAccount(i, { chequeUrl: dataUrl })
  }

  const save = async () => {
    const next = [...accounts]
    for (let i = 0; i < next.length; i++) {
      const a = next[i]
      const anyFilled = a.accountName || a.accountNumber || a.ifsc || a.chequeUrl
      if (!anyFilled) continue
      if (!a.accountName) return setError(`Account ${i + 1}: holder name required`)
      const acc = String(a.accountNumber || '').replace(/\s+/g, '')
      if (!/^\d{6,18}$/.test(acc)) return setError(`Account ${i + 1}: 6-18 digit account number required`)
      const ifsc = String(a.ifsc || '').toUpperCase()
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return setError(`Account ${i + 1}: IFSC must be 11 chars (e.g. HDFC0001234)`)
      if (!a.chequeUrl) return setError(`Account ${i + 1}: cancelled cheque is mandatory`)
      next[i] = { ...a, accountNumber: acc, ifsc, capturedAt: a.capturedAt ?? new Date().toISOString() }
    }
    if (!dietitianId) return
    await updateDietitianDetails(dietitianId, { bankAccounts: next })
    toast.success(`Bank details saved · ${dietitianName}`)
    onSaved()
  }

  return (
    <Dialog open={!!dietitianId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bank details · {dietitianName}</DialogTitle>
        </DialogHeader>
        <p className="text-[11px] -mt-2" style={{ color: 'var(--qms-text-muted)' }}>Multiple accounts supported · cancelled cheque mandatory per account.</p>

        <div className="flex items-center justify-between mt-1 mb-1.5">
          <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>Bank accounts ({accounts.length})</div>
          <Button size="sm" variant="outline" onClick={addAccount}><FiPlus size={12} /> Add account</Button>
        </div>

        {accounts.length === 0 && (
          <div className="rounded-xl border p-3 text-[12px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
            No bank accounts yet — click <strong>Add account</strong>.
          </div>
        )}

        {accounts.map((a, i) => {
          const complete = !!(a.accountNumber && a.ifsc && a.chequeUrl)
          return (
            <div key={i} className="rounded-xl border p-3 mb-2.5" style={complete ? { borderColor: '#10b981', background: 'rgba(16,185,129,.04)' } : { borderColor: 'var(--qms-border)' }}>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <Input className="max-w-52 font-bold" value={a.label ?? ''} onChange={(e) => updateAccount(i, { label: e.target.value })} placeholder={`Account ${i + 1}`} />
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full" style={complete ? { background: 'rgba(16,185,129,.16)', color: '#047857' } : { background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}>
                    {complete ? 'COMPLETE' : 'INCOMPLETE'}
                  </span>
                  <button onClick={() => removeAccount(i)} style={{ color: '#b91c1c' }}><FiTrash2 size={13} /></button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Account holder name</label>
                  <Input value={a.accountName ?? ''} onChange={(e) => updateAccount(i, { accountName: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Account number</label>
                  <Input value={a.accountNumber ?? ''} onChange={(e) => updateAccount(i, { accountNumber: e.target.value })} placeholder="e.g. 1234 5678 9012" />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>IFSC</label>
                  <Input value={a.ifsc ?? ''} onChange={(e) => updateAccount(i, { ifsc: e.target.value })} placeholder="HDFC0001234" />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Bank · branch</label>
                  <Input value={a.branch ?? ''} onChange={(e) => updateAccount(i, { branch: e.target.value })} placeholder="HDFC · Bandra West" />
                </div>
              </div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mt-2.5 mb-1" style={{ color: 'var(--qms-text-muted)' }}>Cancelled cheque / bank-details photo *</label>
              <div className="rounded-xl border border-dashed p-3 text-center" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
                {a.chequeUrl ? (
                  <>
                    <img src={a.chequeUrl} alt="Cancelled cheque" className="max-w-full max-h-32 rounded-lg mx-auto" />
                    <div className="text-[11px] font-bold mt-1" style={{ color: '#047857' }}>Uploaded · re-upload to replace</div>
                  </>
                ) : (
                  <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>Click to choose a cheque photo / passbook page</div>
                )}
                <input type="file" accept="image/*,application/pdf" className="mt-1.5 text-[11px] mx-auto" onChange={(e) => handleChequeUpload(i, e.target.files?.[0])} />
              </div>
            </div>
          )
        })}

        <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          <FiShield size={11} style={{ color: '#10b981' }} />
          Cheque images are held locally in this portal (demo storage only).
        </p>

        {error && <p className="text-[12px] font-semibold" style={{ color: '#b91c1c' }}>{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}><FiCheck size={13} /> Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BankEditModal
