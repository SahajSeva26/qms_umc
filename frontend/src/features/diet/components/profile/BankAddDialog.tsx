import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { addDietitianBank } from '@/features/diet/dietitians.service'

// Compact single-account bank-add dialog — reused by both §5 (onboarding
// action) and §11 (bank-accounts empty state) per the spec. Validation
// mirrors the sibling Dietitian Payment screen's BankEditModal.tsx exactly:
// accountNumber /^\d{6,18}$/, ifsc /^[A-Z]{4}0[A-Z0-9]{6}$/, chequeUrl mandatory.
interface BankAddDialogProps {
  open: boolean
  dietitianId: string
  dietitianName: string
  onClose: () => void
  onSaved: () => void
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })

const empty = {
  label: 'Account 1', accountName: '', accountNumber: '', ifsc: '', branch: '',
  accountType: 'SAVINGS' as 'SAVINGS' | 'CURRENT', upi: '', chequeUrl: '',
}

const BankAddDialog = ({ open, dietitianId, dietitianName, onClose, onSaved }: BankAddDialogProps) => {
  const [draft, setDraft] = useState(empty)
  const [error, setError] = useState('')

  const reset = () => { setDraft(empty); setError('') }
  const handleClose = () => { reset(); onClose() }

  const handleChequeUpload = async (file: File | undefined) => {
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setDraft((p) => ({ ...p, chequeUrl: dataUrl }))
  }

  const save = async () => {
    if (!draft.accountName.trim()) return setError('Account holder name is required')
    const acc = draft.accountNumber.replace(/\s+/g, '')
    if (!/^\d{6,18}$/.test(acc)) return setError('6-18 digit account number required')
    const ifsc = draft.ifsc.toUpperCase()
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return setError('IFSC must be 11 chars (e.g. HDFC0001234)')
    if (!draft.chequeUrl) return setError('Cancelled cheque is mandatory')

    await addDietitianBank(dietitianId, {
      label: draft.label || 'Account', accountName: draft.accountName, accountNumber: acc, ifsc,
      branch: draft.branch, accountType: draft.accountType, upi: draft.upi, chequeUrl: draft.chequeUrl,
    })
    toast.success(`Bank account added · ${dietitianName}`)
    reset()
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add bank/payment method</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="sm:col-span-2">
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Label</label>
            <Input value={draft.label} onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))} placeholder="Account 1" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Account holder name *</label>
            <Input value={draft.accountName} onChange={(e) => setDraft((p) => ({ ...p, accountName: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Account number *</label>
            <Input value={draft.accountNumber} onChange={(e) => setDraft((p) => ({ ...p, accountNumber: e.target.value }))} placeholder="e.g. 1234 5678 9012" />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>IFSC *</label>
            <Input value={draft.ifsc} onChange={(e) => setDraft((p) => ({ ...p, ifsc: e.target.value }))} placeholder="HDFC0001234" />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Bank · branch</label>
            <Input value={draft.branch} onChange={(e) => setDraft((p) => ({ ...p, branch: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>UPI ID</label>
            <Input value={draft.upi} onChange={(e) => setDraft((p) => ({ ...p, upi: e.target.value }))} placeholder="name@bank" />
          </div>
        </div>

        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mt-1 mb-1" style={{ color: 'var(--qms-text-muted)' }}>Cancelled cheque / bank-details photo *</label>
          <div className="rounded-xl border border-dashed p-3 text-center" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
            {draft.chequeUrl ? (
              <>
                <img src={draft.chequeUrl} alt="Cancelled cheque" className="max-w-full max-h-32 rounded-lg mx-auto" />
                <div className="text-[11px] font-bold mt-1" style={{ color: '#047857' }}>Uploaded · re-upload to replace</div>
              </>
            ) : (
              <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>Click to choose a cheque photo / passbook page</div>
            )}
            <input type="file" accept="image/*,application/pdf" className="mt-1.5 text-[11px] mx-auto" onChange={(e) => handleChequeUpload(e.target.files?.[0])} />
          </div>
        </div>

        {error && <p className="text-[12px] font-semibold" style={{ color: '#b91c1c' }}>{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BankAddDialog
