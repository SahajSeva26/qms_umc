import { useEffect, useState } from 'react'
import { FiSave, FiCpu } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { usePeopleData } from '@/hooks/usePeopleData'
import { toast } from '@/components/ui/sonner'
import type { Dietitian, DietitianStatus } from '@/features/diet/diet.types'
import type { DietitianRosterEntry } from '@/features/diet/dietitians.types'
import { errorMessage } from '@/features/diet/utils/errorMessage'

interface EnrollDietitianModalProps {
  open: boolean
  onClose: () => void
  existingDietitian?: Dietitian
  /** Mints canonical identity for a NEW dietitian (roster mutation hook). */
  onEnroll: (payload: {
    name: string; phone: string; email: string
    hq: string; states: string[]; ratePerCamp: number; resumeUrl: string
  }) => Promise<DietitianRosterEntry>
  /** Persists this screen's operational overlay (useDietCamps().upsertDietitianProfile). */
  onSaveProfile: (profile: Dietitian) => Promise<unknown>
}

// Mirrors window.dcAddDietitian exactly (diet-camps.js:2033-2127) — same form
// serves both enrol and edit (existingDietitian present = edit), same
// required-field set (name/email/phone/qualification/state/city), same
// commercial defaults (1500/500/400/150) and machines-assigned multi-pick.
const EnrollDietitianModal = ({ open, onClose, existingDietitian, onEnroll, onSaveProfile }: EnrollDietitianModalProps) => {
  const { devices } = usePeopleData()
  const isEdit = !!existingDietitian

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [qualification, setQualification] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')
  const [interviewed, setInterviewed] = useState<'yes' | 'no'>('no')
  const [status, setStatus] = useState<DietitianStatus>('ACTIVE')
  const [remuneration, setRemuneration] = useState('1500')
  const [ta, setTa] = useState('500')
  const [da, setDa] = useState('400')
  const [printing, setPrinting] = useState('150')
  const [address, setAddress] = useState('')
  const [gmap, setGmap] = useState('')
  const [state_, setState_] = useState('')
  const [city, setCity] = useState('')
  const [machinesAssigned, setMachinesAssigned] = useState<string[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const d = existingDietitian
    setCode(d?.code || '')
    setName(d?.name || '')
    setEmail(d?.email || '')
    setPhone(d?.phone || '')
    setQualification(d?.qualification || '')
    setResumeUrl(d?.resumeUrl || '')
    setInterviewed(d?.interviewed ? 'yes' : 'no')
    setStatus(d?.status || 'ACTIVE')
    setRemuneration(String(d?.remuneration ?? 1500))
    setTa(String(d?.ta ?? 500))
    setDa(String(d?.da ?? 400))
    setPrinting(String(d?.printing ?? 150))
    setAddress(d?.address || '')
    setGmap(d?.gmap || '')
    setState_(d?.state || '')
    setCity(d?.city || '')
    setMachinesAssigned(d?.machinesAssigned || [])
    setError('')
  }, [open, existingDietitian])

  const toggleMachine = (id: string) => {
    setMachinesAssigned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  // Create mints canonical identity FIRST (dietitianRoster.service, the only
  // source assignment reads), then writes this screen's operational overlay
  // against that id. Doing it in that order is what stops an overlay record
  // existing without an identity — the shape that produced blank dietitian
  // names on camp cards.
  const handleSave = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !qualification.trim() || !state_.trim() || !city.trim()) {
      setError('Fill all * fields')
      return
    }
    setError('')
    setSaving(true)
    try {
      let id = existingDietitian?.id
      if (!id) {
        const enrolled = await onEnroll({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          hq: city.trim(),
          states: state_.trim() ? [state_.trim()] : [],
          ratePerCamp: Number(remuneration) || 0,
          resumeUrl: resumeUrl.trim(),
        })
        id = enrolled.id
      }

      await onSaveProfile({
        id,
        code: code.trim(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        qualification: qualification.trim(),
        resumeUrl: resumeUrl.trim(),
        interviewed: interviewed === 'yes',
        remuneration: Number(remuneration) || 0,
        ta: Number(ta) || 0,
        da: Number(da) || 0,
        printing: Number(printing) || 0,
        address: address.trim(),
        gmap: gmap.trim(),
        state: state_.trim(),
        city: city.trim(),
        machinesAssigned,
        status,
        joined: existingDietitian?.joined || new Date().toISOString().slice(0, 10),
      })

      toast.success(`${isEdit ? 'Dietitian updated' : 'Dietitian enrolled'} · ${name.trim()}`)
      onClose()
    } catch (err) {
      setError(errorMessage(err, 'Could not save — try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit dietitian' : 'Enrol dietitian'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Code</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="DT-MUM-01" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Full name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email *</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Mobile *</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Qualification *</label>
            <Input value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="M.Sc. Nutrition · CDE" />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Resume URL</label>
            <Input value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Interviewed?</label>
            <Select value={interviewed} onValueChange={(v) => setInterviewed((v as 'yes' | 'no') ?? 'no')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Status</label>
            <Select value={status} onValueChange={(v) => setStatus((v as DietitianStatus) ?? 'ACTIVE')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="ON_HOLD">ON_HOLD</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Remuneration / camp (₹)</label>
            <Input type="number" min={0} value={remuneration} onChange={(e) => setRemuneration(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>TA / camp (₹)</label>
            <Input type="number" min={0} value={ta} onChange={(e) => setTa(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>DA / camp (₹)</label>
            <Input type="number" min={0} value={da} onChange={(e) => setDa(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Printing / camp (₹)</label>
            <Input type="number" min={0} value={printing} onChange={(e) => setPrinting(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Google Maps link</label>
            <Input value={gmap} onChange={(e) => setGmap(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>State *</label>
            <Input value={state_} onChange={(e) => setState_(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>City *</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Machines assigned</label>
            <div className="rounded-lg border max-h-32 overflow-y-auto" style={{ borderColor: 'var(--qms-border)' }}>
              {devices.map((dev) => {
                const on = machinesAssigned.includes(dev.id)
                return (
                  <button
                    key={dev.id}
                    type="button"
                    onClick={() => toggleMachine(dev.id)}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px]"
                    style={{ background: on ? 'var(--qms-surface-strong)' : 'transparent', color: 'var(--qms-text)' }}
                  >
                    <input type="checkbox" checked={on} readOnly className="pointer-events-none" />
                    {dev.category} · {dev.name}
                  </button>
                )
              })}
              {devices.length === 0 && (
                <div className="px-2.5 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No devices in catalog.</div>
              )}
            </div>
            {machinesAssigned.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {machinesAssigned.map((id) => {
                  const dev = devices.find((x) => x.id === id)
                  return (
                    <span key={id} className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
                      <FiCpu size={10} /> {dev?.name || id}
                    </span>
                  )
                })}
              </div>
            )}
            <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Click to multi-pick. Body composition is typical for diet camps.</div>
          </div>
          {error && <p className="col-span-2 text-[12px]" style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}><FiSave size={13} /> {isEdit ? 'Save changes' : 'Enrol dietitian'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EnrollDietitianModal
