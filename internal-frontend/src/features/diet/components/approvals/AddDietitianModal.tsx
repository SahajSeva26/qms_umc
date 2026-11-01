import { useEffect, useState } from 'react'
import { FiUserPlus } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import { validateDietitianEnrollmentFields } from '@/features/diet/schemas/addDietitian.schemas'
import { useEnrollDietitian } from '@/features/diet/hooks/useDietitianRoster'
import type { DietitianBankAccount } from '@/features/diet/dietitians.types'
import { errorMessage } from '@/features/diet/utils/errorMessage'

interface AddDietitianModalProps {
  open: boolean
  onClose: () => void
  onDone?: () => void
}

const DEVICE_OPTIONS = ['BCA', 'BMI', 'Bloodsugar', 'BP', 'ECG']

const AddDietitianModal = ({ open, onClose, onDone }: AddDietitianModalProps) => {
  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [hq, setHq] = useState('')
  const [states, setStates] = useState('')
  const [ratePerCamp, setRatePerCamp] = useState('3000')
  const [pan, setPan] = useState('')
  const [address, setAddress] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [upi, setUpi] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')
  const [devices, setDevices] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const enrollDietitian = useEnrollDietitian()

  useEffect(() => {
    if (!open) return
    setName(''); setSpecialty(''); setPhone(''); setEmail(''); setHq(''); setStates('')
    setRatePerCamp('3000'); setPan(''); setAddress('')
    setBankName(''); setAccountHolder(''); setAccountNumber(''); setIfsc(''); setUpi('')
    setResumeUrl(''); setDevices(new Set()); setError('')
  }, [open])

  const toggleDevice = (d: string) => {
    setDevices((prev) => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  const handleSubmit = async () => {
    // Shared rules (required name, valid-if-present email, numeric rate) come
    // from schemas/addDietitian.schemas.ts; this screen keeps its own payload
    // construction below because it differs from the profile screen's.
    const check = validateDietitianEnrollmentFields(
      { name, specialty, phone, email, hq, states, ratePerCamp, pan, address, bankName, accountHolder, accountNumber, ifsc, upi, resumeUrl, devices },
      'Dietitian name is required',
    )
    if (!check.ok) { toast.error(check.error); return }
    setError('')
    const bankAccounts: DietitianBankAccount[] = []
    if (accountNumber.trim() || upi.trim()) {
      bankAccounts.push({
        label: 'Primary',
        accountName: accountHolder.trim() || name.trim(),
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        branch: bankName.trim(),
        upi: upi.trim(),
      })
    }
    try {
      await enrollDietitian.mutateAsync({
        name: name.trim(),
        specialty: specialty.trim() || 'Clinical nutrition',
        phone: phone.trim(),
        email: email.trim(),
        hq: hq.trim(),
        states: states.split(',').map((s) => s.trim()).filter(Boolean),
        ratePerCamp: Math.max(0, Number(ratePerCamp) || 0),
        pan: pan.trim(),
        address: address.trim(),
        bankAccounts,
        resumeUrl: resumeUrl.trim(),
        deviceAlignment: Array.from(devices),
      })
    } catch (err) {
      setError(errorMessage(err, 'Could not enrol the dietitian — try again.'))
      return
    }
    toast.success(`Dietitian enrolled · ${name.trim()}`)
    onClose()
    onDone?.()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Dietitian</DialogTitle>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Enrol a new dietitian into the master</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <FieldText label="Full name *" value={name} onChange={setName} />
          <FieldText label="Specialty" value={specialty} onChange={setSpecialty} placeholder="Clinical nutrition" />
          <FieldText label="Phone" value={phone} onChange={setPhone} />
          <FieldText label="Email" value={email} onChange={setEmail} type="email" />
          <FieldText label="HQ city" value={hq} onChange={setHq} />
          <FieldText label="States covered" value={states} onChange={setStates} placeholder="KA, MH" />
          <FieldText label="Rate per camp ₹" value={ratePerCamp} onChange={setRatePerCamp} type="number" />
          <FieldText label="PAN" value={pan} onChange={setPan} />
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Address</label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-[11.5px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>Bank / payment (optional)</div>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <FieldText label="Bank name" value={bankName} onChange={setBankName} />
            <FieldText label="Account holder" value={accountHolder} onChange={setAccountHolder} />
            <FieldText label="Account number" value={accountNumber} onChange={setAccountNumber} />
            <FieldText label="IFSC" value={ifsc} onChange={setIfsc} />
            <FieldText label="UPI ID" value={upi} onChange={setUpi} />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-[11.5px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>Resume & device alignment</div>
          <FieldText label="Resume link / path" value={resumeUrl} onChange={setResumeUrl} />
          <div className="flex flex-wrap gap-2 mt-2">
            {DEVICE_OPTIONS.map((d) => {
              const on = devices.has(d)
              return (
                <button
                  key={d} type="button" onClick={() => toggleDevice(d)}
                  className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full border"
                  style={{
                    background: on ? 'rgba(59,109,255,.12)' : 'transparent',
                    borderColor: on ? 'var(--qms-brand)' : 'var(--qms-border)',
                    color: on ? 'var(--qms-brand)' : 'var(--qms-text-muted)',
                  }}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>

        {error && <p className="text-[12px] mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={enrollDietitian.isPending}><FiUserPlus size={13} /> Enrol dietitian</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldText({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} min={type === 'number' ? 0 : undefined} />
    </div>
  )
}

export default AddDietitianModal
